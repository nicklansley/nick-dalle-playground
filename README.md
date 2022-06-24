# Nick's Dalle playground

A playground for DALL-E enthusiasts to tinker with the open-source version of
OpenAI's [DALL-E](https://openai.com/blog/dall-e/), based on [DALL-E Mini](https://github.com/borisdayma/dalle-mini).

Setup service (takes 5 mins if the data has already been downloaded):

<pre>
docker compose up -d --build
</pre>

Add NGROK tunnel -OR- use http://localhost:8000/ 
<pre>
ngrok http --region=eu --hostname=farspace.lansley.com 8000
</pre>

Bring down the service:
<pre>
docker compose down
</pre>
