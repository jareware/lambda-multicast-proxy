#!/bin/bash

set -e # exit on error
PATH="$PATH:./node_modules/.bin" # allows us to run "npm binaries"

echo -n "Checking for clean working copy... "
if [ "$(git diff-index HEAD)" != "" ]; then
  echo -e "ERROR\n\nThere's uncommitted changes in the working copy"
  exit 1
fi
echo OK

echo -n "Parsing git remote... "
github_raw="$(git config --get remote.origin.url | sed 's/.*://' | sed 's/\..*//')" # e.g. "git@github.com:user/project.git" => "user/project"
github_user="$(echo "$github_raw" | cut -d / -f 1)"
github_project="$(echo "$github_raw" | cut -d / -f 2)"
if [[ ! "$github_user" =~ ^[[:alnum:]-]+$ ]]; then
  echo -e "ERROR\n\nCan't seem to determine GitHub user name reliably: \"$github_user\""
  exit 1
fi
if [[ ! "$github_project" =~ ^[[:alnum:]-]+$ ]]; then
  echo -e "ERROR\n\nCan't seem to determine GitHub project name reliably: \"$github_project\""
  exit 1
fi
echo OK

echo -n "Verifying GitHub API access... "
github_test="$(curl -s -n -o /dev/null -w "%{http_code}" https://api.github.com/user)"
if [ "$github_test" != "200" ]; then
  echo -e "ERROR\n\nPlease ensure that:"
  echo "* You've set up a Personal access token for the GitHub API (https://github.com/settings/tokens/new)"
  echo "* The resulting token is listed in your ~/.netrc file (under \"machine api.github.com\" and \"machine uploads.github.com\")"
  exit 1
fi
echo OK

echo -n "Running pre-release QA tasks... "
npm run lint > /dev/null
npm run test > /dev/null
echo OK

echo -n "Building Lambda function... "
echo 'var lambda = exports;' > index.js
browserify -p tsify --node index.ts >> index.js
echo OK

echo
echo -n "This release is major/minor/patch: "
read version_bump
echo

echo -n "Committing and tagging new release... "
version_tag="$(npm version -m "Release %s" "$version_bump")"
echo OK

echo -n "Pushing tag to GitHub... "
git push --quiet origin "$version_tag"
echo OK

release_zipfile="$github_project-$version_tag.zip"
echo -n "Compressing Lambda function... "
zip "$release_zipfile" index.js > /dev/null
echo OK

echo -n "Creating release on GitHub... " # https://developer.github.com/v3/repos/releases/
curl -o curl-out -s -n -X POST "https://api.github.com/repos/$github_user/$github_project/releases" --data "{\"tag_name\":\"$version_tag\"}"
release_upload_url="$(cat curl-out | node -p 'JSON.parse(fs.readFileSync(0)).upload_url' | sed 's/{.*//')"
release_html_url="$(cat curl-out | node -p 'JSON.parse(fs.readFileSync(0)).html_url')"
if [[ ! "$release_upload_url" =~ ^https:// ]]; then
  echo ERROR
  cat curl-out
  exit 1
fi
echo OK

echo -n "Uploading release zipfile... "
release_upload_result="$(curl -o /dev/null -w "%{http_code}" -s -n "$release_upload_url?name=$release_zipfile" --data-binary @"$release_zipfile" -H "Content-Type: application/octet-stream")"
if [ "$release_upload_result" != "201" ]; then
  echo -e "ERROR\n\nRelease upload gave unexpected HTTP status: \"$release_upload_result\""
  exit 1
fi
echo OK

echo -n "Cleaning up... "
rm curl-out "$release_zipfile" index.js
echo OK

echo
echo "New release: $release_html_url"
echo
