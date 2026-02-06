#!/usr/bin/env bash
# exit on error
set -o errexit

# Initial setup
mix deps.get --only prod
MIX_ENV=prod mix tz_world.update --include-oceans
MIX_ENV=prod mix compile

# Install npm dependencies
cd assets && npm install && cd ..

# Compile assets
# Make sure tailwind and esbuild are installed
MIX_ENV=prod mix assets.build
# Build minified assets
MIX_ENV=prod mix assets.deploy

# Run database migrations
MIX_ENV=prod mix ecto.migrate

# Create server script, Build the release, and overwrite the existing release directory
MIX_ENV=prod mix phx.gen.release
MIX_ENV=prod mix release --overwrite