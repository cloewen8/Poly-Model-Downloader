const { mkdirSync, rmdirSync, createWriteStream, existsSync } = require('fs');
const parsePath = require('path').parse;
const sanitize = require("sanitize-filename");
const fetch = require('node-fetch');

// The API endpoint to start with.
const API = 'https://poly.googleapis.com/v1/';
// Preferred model formats (in order).
const FORMATS = ['GLTF2', 'GLTF', 'FBX', 'OBJ'];
// Key passed to Poly.
const KEY = process.env["GOOGLE_POLY_KEY"];
// How many requests can be sent at a time.
const MAX_REQUESTS = 3000;
// How long to wait before sending the next batch of requests.
const REQUESTS_CONTINUE = 60000; // 1 minute
// How many times to retry requests (increase if you have a bad connection).
const MAX_RETRIES = 3;
// The name of a folder to place the assets in.
const DESTINATION = 'Poly Assets/';
// A summary to put at the start of the summary file.
const SUMMARY_HEADING = `SUMMARY

This folder contains a collection of 3D models from Poly. \
Poly was a website by Google that provided 3D models to game developers. \
All of these models where provided by the Poly team and are licensed under the Creative Commons CC-BY license \
("You're free to use this as long as you credit the author" - Google).
The CC-BY license is available at: https://creativecommons.org/licenses/by/3.0/

Below is a list of what was downloaded in the format: path. name - description by author

`;

let summaryEntries = [];
let requestsCount = 0;

// Records an entry for the summary file.
function recordEntry(text) {
	summaryEntries.push(text);
}

// Writes the summary file.
function writeSummary() {
	const fileStream = createWriteStream(DESTINATION + 'summary.txt');
	fileStream.write(SUMMARY_HEADING);
	for (let entry of summaryEntries)
		fileStream.write(entry + '\n');
	console.log("Complete!");
	fileStream.end();
}

function checkQuota(callback) {
	requestsCount++;
	if (requestsCount >= MAX_REQUESTS) {
		console.log('Max requests reached, waiting a minute...');
		return new Promise(function(resolve, reject) {
			setTimeout(function() {
				console.log('Continuing...');
				requestsCount = 0;
				callback().then(resolve, reject);
			}, REQUESTS_CONTINUE);
		});
	} else
		return callback();
}

function isTiltBrush(formats) {
	for (let format of formats)
		if (format.formatType === 'TILT')
			return true;
	return false;
}

function getBestFormat(formats) {
	for (let fname of FORMATS)
		for (let format of formats)
			if (format.formatType === fname)
				return format;
	return null;
}

function getFolderName(asset) {
	return sanitize(asset.displayName + '-' + asset.name.substring(7));
}

async function downloadFile(url, fileName) {
	let res = await fetch(url);
	await new Promise(function(resolve, reject) {
		mkdirSync(parsePath(fileName).dir, { recursive: true });
		let fileStream = createWriteStream(fileName);
		fileStream.on('error', reject);
		fileStream.on('close', resolve);
		res.body.pipe(fileStream);
	});
}

async function fetchAsset(asset, tries=0) {
	tries++;
	if (tries > MAX_RETRIES)
		recordEntry('ERROR\tUnable to download asset: ' + asset.name);
	else {
		let format = getBestFormat(asset.formats);
		let file = format.root;
		let assetDest = DESTINATION + getFolderName(asset) + '/';
		await checkQuota(async function() {
			if (format === null)
				console.log(`Unable to download asset (no supported formats): ${assetDest + file.relativePath} (${asset.name})`);
			else if (isTiltBrush(asset.formats))
				console.log(`Ignoring Tilt Brush model: ${assetDest} (${asset.name})`);
			else {
				console.log(`Downloading asset: ${assetDest + file.relativePath} (${asset.name})`);
				// Create a folder.
				mkdirSync(assetDest);
				// Download the file.
				await downloadFile(file.url, assetDest + file.relativePath);
				// Download resources.
				if (format.resources) {
					await checkQuota(async function() {
						for (let resFile of format.resources) {
							console.log(`Downloading asset resource: ${assetDest + resFile.relativePath} (${asset.name})`);
							await downloadFile(resFile.url, assetDest + resFile.relativePath);
						}
					});
				}
				recordEntry(`DOWNLOADED\t${assetDest + file.relativePath}. ${asset.displayName} - ${asset.description || ''} by ${asset.authorName}`);
			}
		}).catch(function(err) {
			console.error('Unable to load asset: ' + err);
			rmdirSync(assetDest, { recursive: true });
			return fetchAsset(asset, tries);
		});
	}
}

async function fetchPage(page, tries=0) {
	tries++;
	if (tries > MAX_RETRIES)
		recordEntry('ERROR\tUnable to fetch the next page: ' + page);
	else
		await checkQuota(async function() {
			let url = `${API}assets`;
			let params = [];
			params.push('key=' + KEY);
			params.push('pageSize=' + 100);
			params.push('curated=true');
			if (page !== null)
				params.push('pageToken=' + page);
			url += '?' + params.join('&');
			let res = await fetch(url);
			if (!res.ok)
				throw `${res.statusText} (${res.status})`;
			let result = await res.json();
			for (let asset of result.assets)
				await fetchAsset(asset);
			if (result.nextPageToken)
				await fetchPage(result.nextPageToken);
		}).catch(function(err) {
			console.error('Unable to load page: ' + err);
			return fetchPage(page, tries);
		});
}

async function main() {
	console.warn(`WARNING

Now that Google Poly has been fully shutdown, this tool is no longer being maintained.
It may stop working at any time and should not be relied on.`);
	if (existsSync(DESTINATION)) {
		console.log('Removing existing directory...')
		rmdirSync(DESTINATION, { recursive: true });
	}
	console.log('Downloading assets...');
	mkdirSync(DESTINATION);
	await fetchPage(null);
	writeSummary();
}

if (KEY === undefined)
	console.error("The environment variable GOOGLE_POLY_KEY must be set first.");
else
	main().catch(err => console.log('Unexpected error occurred: ' + err));
