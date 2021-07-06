const canvas = document.querySelector('canvas#render');
const height = document.querySelector('input[name="height"]');
const width = document.querySelector('input[name="width"]');
const colorSelect = document.querySelector('select[name="color"]');
const customColor = document.querySelector('input[name="custom-color"]');
const withManifest = document.querySelector('input[name="manifest"]');
const extendedManifest = document.querySelector('input[name="extended"]');
const manifestFormat = document.querySelector('select[name="manifest-format"]');
const files = document.querySelector('input[type="file"]');

const RE_STRIP_EXTENSION = /^(.*?)(\.[^.]*?)?$/;
function stripExtension(fileName) {
	return fileName.replace(RE_STRIP_EXTENSION, '$1');
}
function pngExtension(fileName) {
	return stripExtension(fileName) + '.png';
}

function recolorSVG(svg, color) {
	for (let i = 0; i < svg.children.length; i++) {
		const child = svg.children[i];
		if (typeof child.isPointInFill === 'function') child.setAttribute('fill', color);
		recolorSVG(child, color);
	}
}

function render(file, width, height, color, manifest) {
	return new Promise(finish => {
		// Read the SVG
		const reader = new FileReader();
		reader.onload = function(e) {
			const svg = document.adoptNode(new DOMParser().parseFromString(e.target.result, 'image/svg+xml').children[0]);

			// Render the SVG
			document.body.appendChild(svg);
			
			// Fit the SVG
			var bbox = svg.getBBox();
			svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

			if (width) svg.setAttribute('width', width);
			if (height) svg.setAttribute('height', height);

			// Size the canvas appropriately
			canvas.width = Number(svg.getAttribute('width'));
			canvas.style.width = canvas.width + 'px';
			canvas.height = Number(svg.getAttribute('height'));
			canvas.style.height = canvas.height + 'px';

			// Add to manifest
			if (manifest) {
				var bbox = svg.getBBox();
				const ctm = svg.getCTM();

				let xy = svg.createSVGPoint();
				xy.x = bbox.x;
				xy.y = bbox.y;
				xy = xy.matrixTransform(ctm);

				let wh = svg.createSVGPoint();
				wh.x = bbox.width;
				wh.y = bbox.height;
				wh = wh.matrixTransform(ctm);

				var bbox = {
					width: Math.round(wh.x),
					height: Math.round(wh.y),
					left: Math.round(xy.x),
					top: Math.round(xy.y)
				};

				manifest[stripExtension(file.name)] = extendedManifest.checked ? {
					color,
					width: Math.round(canvas.width),
					height: Math.round(canvas.height),
					bbox,
				} : bbox;
			}

			// Recolor the SVG
			if (color) recolorSVG(svg, color);

			// Create a blob of the SVG
			const blob = new Blob([svg.outerHTML], {type: 'image/svg+xml'});

			// Remove the SVG
			svg.remove();

			// Create the Image
			const img = new Image();
			img.onload = function() {
				const ctx = canvas.getContext('2d');
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
				
				// Create a PNG from the canvas
				const imageData = canvas.toDataURL('image/png').substr('data:image/png;base64,'.length);
				finish(imageData);
			};
			img.src = URL.createObjectURL(blob);
		};
		reader.readAsBinaryString(file);
	});
}

async function iconify(file, width, height, color) {
	// Render SVG and get PNG Base64
	const imageData = await render(file, width, height, color);

	// Convert Base64 to Blob
	const blob = new Blob([base64DecToArr(imageData)], {type: 'image/png'});

	// Save blob
	saveAs(blob, pngExtension(file.name));
}

async function iconifyZIP(files, width, height, color, manifest) {
	const zip = new JSZip();

	for (let i = 0; i < files.length; i++) {
		const file = files[i];

		// Render SVG and get PNG Base64
		const imageData = await render(file, width, height, color, manifest);

		// Add it to the ZIP
		zip.file(pngExtension(file.name), imageData, {base64: true});
	}

	if (manifest) zip.file('manifest.' + manifestFormat.value, stringifyManifest(manifest));

	saveAs(await zip.generateAsync({type: 'blob'}), 'iconify.zip');
}

function formUpdate() {
	if (height.value.length === 0)
		height.setAttribute('placeholder', width.value.length > 0 ? width.value : width.getAttribute('placeholder'));
	
	if (colorSelect.value === 'custom') {
		customColor.style.display = 'initial';
		customColor.required = true;
	} else {
		customColor.style.display = 'none';
		customColor.required = false;
	}
}
formUpdate()

function iconifySubmit(e) {
	e.preventDefault();
	e.stopPropagation();

	let color;
	switch (colorSelect.value) {
		case 'custom':
			color = customColor.value;
			break;
		
		case 'black':
			color = '#000000';
			break;
	
		case 'white':
			color = '#ffffff';
			break;
	}

	const desiredWidth = width.value.length > 0 ? width.value : null;
	const desiredHeight = height.value.length > 0 ? Number(height.value) : desiredWidth;

	if (files.files.length === 1 && !withManifest.checked)
		iconify(files.files[0], desiredWidth, desiredHeight, color);
	else
		iconifyZIP(files.files, desiredWidth, desiredHeight, color, withManifest.checked ? {} : undefined);

	return false;
}

function stringifyManifest(manifest) {
	switch (manifestFormat.value) {
		case 'json':
			return JSON.stringify(manifest);

		case 'lua': {
			function luaKV(tbl) {
				let lua = '{';

				for (const k in tbl) {
					const v = tbl[k];
					switch (typeof v) {
						case 'object':
							lua += k + '=' + luaKV(v);
							break;
						
						case 'null':
						case 'undefined':
							continue;

						default:
							lua += k + '=' + v;
					}
					lua += ',';
				}
				
				lua = lua.substr(0, lua.length - 1) + '}';
				return lua;
			}

			let lua = '{';
			for (const file in manifest) {
				lua += '["' + file + '"]=' + luaKV(manifest[file]) + ',';
			}
			lua = lua.substr(0, lua.length - 1) + '}';
			return lua;
		}
	}
}