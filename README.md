# Poly Model Downloader
A tool I made in a day to download Google's curated Poly models.

## Features
Simply put, it collects, filters and downloads 3d models from Poly.

- It will create a new folder for the assets.
- Model resources (such as textures) are also downloaded.
- Each asset gets its own uniquely named folder (which prevents name conflicts).
- It skip over non-curated and Tilt Brush based models.
- It will pick the best format in order: GLTF2 (best case), GLTF, FBX, OBJ (worst case).
- Each model that is downloaded, skipped or that failed to download is logged.
- A summary.txt file will be created which gives a description of the folder, Google Poly, the model licenses (always CC-BY).
- The summary file includes a list of all the downloaded models (the name, its author and description).

Last time I used this tool, it downloaded roughly 13.6 GB of models and took several hours. Fair warning:

- Make sure you have the space.
- Don't run this on a low-powered device.
- I recommend putting on a good video or movie while you wait.
- I am not responsible for any damage that may occur by running this tool.

## Setup
I assume you know how to use npm-based command line tools and environment variables. If you don't, please do your own research and make sure you understand what is involved.

The only thing required to use this tool is an API key, which can be requested from: https://developers.google.com/poly/develop/api#create_credentials
Once you have your API key, place it into an environment variable named `GOOGLE_POLY_KEY`.

Now just install (`npm install`) and run it (`npm start`).

The tool can be configured further by editing the `const` variables at the top of the cli.js script (comments included).

# Notice

I am in no way associated with Google, Poly or the model authors. If you use this tool, it is at your own risk (please see the included license).
