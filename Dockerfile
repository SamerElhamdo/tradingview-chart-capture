# Use Apify's Node.js Playwright Chrome image
FROM apify/actor-node-playwright-chrome:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --include=dev

# Copy source code
COPY . ./

# Set environment variable for Apify
ENV APIFY_DEFAULT_DATASET_ID=default
ENV APIFY_DEFAULT_KEY_VALUE_STORE_ID=default

# Run the actor
CMD ["node", "main.js"]

