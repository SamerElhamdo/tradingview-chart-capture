# Use Apify's Node.js Playwright Chrome image
FROM apify/actor-node-playwright-chrome:20

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm install --omit=dev

# Copy source code
COPY . ./

# Run the actor
CMD ["node", "main.js"]

