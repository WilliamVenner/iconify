# iconify

This is a stupid simple website that can generate PNG icons from SVG files in your browser.

## Why?

I am an avid user of [flaticon.com](https://flaticon.com) and typically embed the icons in websites and games.

However, unfortunately many of the SVGs on this website (and I'm sure many others) are positioned incorrectly.

This means, if you try to download a PNG version of the icon, it could be uncentered and even padded, so downloading a standard square size of the icon as a PNG gives you a PNG with some annoying space around the icon.

This messes up the consistency of your icons across your application.

This website will trim the empty space around SVGs, center them correctly, scale them to a desired standard width and height and even recolour the SVG for you.

Additionally, you can choose to output a `manifest.json` file which will include some metadata about each image, including useful data for centering the icons or aligning it with text correctly, which is especially useful in games or raw rendering contexts.

## How to use

Open [the website](https://williamvenner.github.io/iconify/), select SVG files, enter your desired width, height and colour and hit "Iconify!"

The website will generate a ZIP file containing the manifest (if enabled) and all your PNG files.

If you only uploaded one SVG and didn't want a manifest, you'll simply get a PNG back.