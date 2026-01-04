from flask import Flask, request, jsonify, send_from_directory
import requests
from bs4 import BeautifulSoup
import os

app = Flask(__name__, static_folder='.')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/metadata')
def get_metadata():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'Missing URL parameter'}), 400

    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    try:
        # Default User Agent
        user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        
        # Check if it's a social media site known for strict scraping protections
        # Using a bot user agent often gets the OG tags page instead of a login wall
        if any(domain in url.lower() for domain in ['instagram.com', 'facebook.com', 'whatsapp.com']):
            user_agent = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

        headers = {
            'User-Agent': user_agent,
            'Accept-Language': 'en-US,en;q=0.9',
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract title
        title = None
        # Priority to OG Title
        og_title = soup.find('meta', property='og:title')
        if og_title:
            title = og_title.get('content')
        if not title:
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.string
        if not title:
            title = url

        # Extract image
        image = None
        og_image = soup.find('meta', property='og:image')
        if og_image:
            image = og_image.get('content')
            # Handle relative URLs for images
            if image and not image.startswith(('http://', 'https://')):
                 from urllib.parse import urljoin
                 image = urljoin(url, image)
        
        # Additional cleanup for Instagram/FB images if they are generic or login-wall images
        # (This is hard to perfect without a real browser, but we can try)

        # Extract description
        description = None
        og_desc = soup.find('meta', property='og:description')
        if og_desc:
            description = og_desc.get('content')
        if not description:
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc:
                description = meta_desc.get('content')
        
        return jsonify({
            'title': title,
            'image': image or '',
            'description': description or ''
        })

    except requests.RequestException as e:
        print(f"Error fetching URL {url}: {e}")
        # Return fallback data so the frontend can still add the link
        return jsonify({
            'title': url,
            'image': '',
            'description': ''
        })
    except Exception as e:
         print(f"Error parsing URL {url}: {e}")
         return jsonify({
            'title': url,
            'image': '',
            'description': ''
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
