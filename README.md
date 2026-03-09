# shopivibe
My ideal Shopify theme...but vibe-coded

## The Plan
- Vite build process
- Lit components
- Tailwind classes/styling
- Snippets can include their own JS, deduplicated overall
- Translations are automatically built into a big JS file to use in scripts
- Regional files and the ability to watch/deploy multiple themes simultaneously
- Hot reloading

## Regional Build Process
You have a .creds.yml.

Inside the shopify creds, each top-level node is a store.

When starting any build process, you will be asked which stores you want to include, unless you have a .env variable "STORES" already set.

As many stores as you select is as many dist directories as will be made. Each will use their own regionalised files from /regional, in addition to any files from src.

e.g. if you run npm run watch, you are asked which stores you want to develop on, and if you say "au, us and uk", you will get 3 dist directories, all watching.

Any terminal processes will be done in their own tabs so that you can answer questions. 