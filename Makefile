.PHONY: install dev build preview clean test test-unit test-unit-watch test-e2e

install:
	npm install

dev:
	npm run dev

build:
	npm run build
	@CSS_FILE=$$(ls dist/assets/index-*.css) && \
	JS_FILE=$$(ls dist/assets/index-*.js) && \
	{ \
	  echo '<!DOCTYPE html>'; \
	  echo '<html lang="en">'; \
	  echo '<head>'; \
	  echo '<meta charset="UTF-8" />'; \
	  echo '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'; \
	  echo '<title>TON Wallet</title>'; \
	  echo '<style>'; \
	  cat "$$CSS_FILE"; \
	  echo '</style>'; \
	  echo '</head>'; \
	  echo '<body>'; \
	  echo '<div id="root"></div>'; \
	  echo '<script type="module">'; \
	  cat "$$JS_FILE"; \
	  echo '</script>'; \
	  echo '</body>'; \
	  echo '</html>'; \
	} > dist/ton-wallet.html
	@echo "Built dist/ton-wallet.html ($$(wc -c < dist/ton-wallet.html) bytes)"

preview:
	npm run preview

clean:
	rm -rf dist node_modules

test:
	npm test

test-unit:
	npm run test:unit

test-unit-watch:
	npm run test:unit:watch

test-e2e:
	npm run test:e2e
