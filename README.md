# MDfy is an api  that converts webpage content into markdown for  RAG
- extract DOM from site using pupeteer
- simple sitecrawler (scrape subpages without sitemap)
- html to md using  turndown
- md  noise filter with mistralai/Mixtral-8x22B-Instruct-v0.1 (64k context)


  # To do:
- ~~finalise llm to denoise md~~
- ~~express endpoint~~ 
- work on concurency

### Installation

1. Navigate to the project directory in your terminal.

2. Install the project dependencies:

```bash
npm install
```

3. Create a .env file in the root of your project and add your DeepInfra API key:
Replace your_api_key with your actual DeepInfra API key.

  Running the API
  To start the API, run the following command in your terminal:

 ````bash
  nodemon index.js
  ````
Using the API
To convert webpage content into markdown, make a GET request to the /web2md endpoint with the url and numPages query parameters. For example:

````bash
  curl "http://localhost:3000/web2md?url=https://example.com&numPages=5"
````
This will return the markdown content of the specified webpage.

