# Trusted Setup Ceremony

This repository manages a trusted setup ceremony for a zero-knowledge circuit. Each participant contributes randomness to ensure that no single person knows the "toxic waste" that could compromise the system.

## Coordinator Instructions

1. Initialize the repository with:
   - Copy r1cs and zkey files to the `0000_initial` folder

2. Push this initial setup to the repository.

## Participant Instructions

1. Clone this repository:
   ```
   git clone https://github.com/your-username/trusted-setup.git
   cd trusted-setup
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Contribute randomness:
   ```
   npm run contribute
   ```
   - Enter your GitHub username when prompted
   - Provide some random entropy when asked (type randomly on your keyboard)
   - The script will create a new folder with your contribution

4. Commit and push your changes:
   ```
   git add .
   git commit -m "Add contribution from YOUR_GITHUB_USERNAME"
   git push origin main
   ```

## Verification

To verify all contributions in the ceremony:

## Using Docker

This trusted setup ceremony for the Panther Protocol can be run using Docker, which ensures a consistent environment regardless of your local setup.

### Building the Docker Image

1. Build the Docker image:
   ```
   docker build -t panther-trusted-setup .
   ```

### Running the Ceremony with Docker

Use Docker to run the contribution or verification process:

#### To Contribute

```bash
docker run --rm -it -v $(pwd):/app panther-trusted-setup contribute
```

#### To Verify All Contributions

```bash
docker run --rm -v $(pwd):/app panther-trusted-setup verify
```

### Notes on Docker Usage

- The `-v $(pwd):/app` option mounts your current directory to the container, allowing the container to read and write files directly in your project folder
- The `-it` flag is needed for the contribute command as it requires interactive input
- All contributions will be saved to your local filesystem
- The `--rm` flag ensures the container is removed after execution
- You don't need to install Node.js or any dependencies on your host machine
