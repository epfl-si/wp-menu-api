SHELL := /bin/bash

NAMESPACE = wordpress-test
WP_OPERATOR_IMAGE_NAME = quay-its.epfl.ch/svc0041/menu-api
WP_OPERATOR_IMAGE_TAG ?= 2025-$(ver)

.PHONY: help
## Print this help
help:
	@echo "$$(tput setaf 2)Available rules:$$(tput sgr0)";sed -ne"/^## /{h;s/.*//;:d" -e"H;n;s/^## /---/;td" -e"s/:.*//;G;s/\\n## /===/;s/\\n//g;p;}" ${MAKEFILE_LIST}|awk -F === -v n=$$(tput cols) -v i=4 -v a="$$(tput setaf 6)" -v z="$$(tput sgr0)" '{printf"- %s%s%s\n",a,$$1,z;m=split($$2,w,"---");l=n-i;for(j=1;j<=m;j++){l-=length(w[j])+1;if(l<= 0){l=n-i-length(w[j])-1;}printf"%*s%s\n",-i," ",w[j];}}'

.PHONY: image
## Build, tag and push the image
image: build push

.PHONY: build
## Build the image as `WP_OPERATOR_IMAGE_NAME`
build:
	docker build -t $(WP_OPERATOR_IMAGE_NAME):$(WP_OPERATOR_IMAGE_TAG) .

.PHONY: push
## Push the image using `REGISTRY` and `WP_OPERATOR_IMAGE_TAG`
push:
	docker push $(WP_OPERATOR_IMAGE_NAME):$(WP_OPERATOR_IMAGE_TAG)
