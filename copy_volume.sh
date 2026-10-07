#!/bin/sh

PROJECT="$@"

DIRECTORY="/data/$PROJECT"

if [ -d "$DIRECTORY" ]; then
    rm -rf $DIRECTORY
fi

mkdir -p $DIRECTORY

mv /tmp/* $DIRECTORY