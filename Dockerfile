# Use Node.js LTS as base image
FROM node:18

# Set working directory in the container
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy only the TypeScript config and source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Default command that will show usage information
CMD echo "Usage: docker run --rm -v $(pwd):/app trusted-setup [contribute|verify]" && \
    echo "  - contribute: Run the contribution process" && \
    echo "  - verify: Run the verification process"

ENTRYPOINT ["npm", "run"]