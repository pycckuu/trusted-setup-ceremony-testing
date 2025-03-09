import * as fs from "fs-extra";
import { execSync } from "child_process";
import * as readlineSync from "readline-sync";
import * as path from "path";
import * as crypto from "crypto";

interface ContributionConfig {
  contributionNumber: string;
  githubUsername: string;
  folderName: string;
  timestamp: string;
}

interface ZkeyContribution {
  filename: string;
  hash: string;
}

interface ContributionResult {
  config: ContributionConfig;
  contributions: ZkeyContribution[];
}

function getDirectories(source: string): string[] {
  return fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

function getZkeyFiles(directory: string): string[] {
  return fs.readdirSync(directory).filter((file) => file.endsWith(".zkey"));
}

function generateSecureEntropy(): string {
  return crypto.randomBytes(128).toString("hex");
}

function collectAdditionalEntropy(): string {
  if (readlineSync.keyInYN("Would you like to add additional entropy by typing random keys?")) {
    const additionalEntropy = readlineSync.question("Please mash your keyboard randomly (hidden input): ", {
      hideEchoBack: true,
    });
    console.log("Additional entropy received (not displayed for security)");
    return additionalEntropy;
  }
  return "";
}

function getContributionFolders(): string[] {
  const folders = getDirectories("./");
  const contributionFolders = folders.filter((f) => f.match(/^\d{4}_/));
  contributionFolders.sort();
  return contributionFolders;
}

function setupContribution(): ContributionConfig {
  const contributionFolders = getContributionFolders();
  const lastFolder = contributionFolders[contributionFolders.length - 1];
  const lastContribution = parseInt(lastFolder.substring(0, 4));
  const contributionNumber = (lastContribution + 1).toString().padStart(4, "0");

  const githubUsername = readlineSync.question("Enter your GitHub username: ");
  const folderName = `${contributionNumber}_${githubUsername}`;

  fs.mkdirSync(folderName);

  return {
    contributionNumber,
    githubUsername,
    folderName,
    timestamp: new Date().toISOString(),
  };
}

function contributeToZkey(zkeyFile: string, lastFolder: string, config: ContributionConfig, baseEntropy: string): ZkeyContribution {
  console.log(`\nProcessing ${zkeyFile}...`);

  const latestZkey = path.join(lastFolder, zkeyFile);
  const newZkey = path.join(config.folderName, zkeyFile);

  // Contribute to this zkey
  console.log(`Contributing to ${zkeyFile}...`);
  const contributionName = `Contribution #${config.contributionNumber} from ${config.githubUsername}`;

  // Generate a unique entropy for each contribution by hashing the base entropy
  const uniqueEntropy = crypto.createHash('sha512').update(baseEntropy, 'utf8').digest('hex');

  // Use echo to pipe the entropy to snarkjs instead of using -e param
  const command = `echo ${uniqueEntropy} | snarkjs zkey contribute -v ${latestZkey} ${newZkey} --name="${contributionName}"`;

  console.log(`Executing contribution command (not showing entropy for security)...`);
  execSync(command, { stdio: "inherit" });

  // Export verification key
  const vkeyName = zkeyFile.replace(".zkey", "_verification_key.json");
  const vkey = path.join(config.folderName, vkeyName);
  execSync(`snarkjs zkey export verificationkey ${newZkey} ${vkey}`, { stdio: "inherit" });

  // Generate transcript for this contribution
  const transcriptPath = path.join(config.folderName, `${zkeyFile}_transcript.txt`);
  fs.writeFileSync(transcriptPath, `Contribution to ${zkeyFile} by ${config.githubUsername}\nTimestamp: ${config.timestamp}\n`);

  console.log(`✅ Contribution to ${zkeyFile} complete!`);

  // Calculate hash for attestation
  const hash = crypto.createHash("sha256").update(fs.readFileSync(newZkey)).digest("hex");

  return {
    filename: zkeyFile,
    hash,
  };
}

function createMetadataFiles(config: ContributionConfig, contributions: ZkeyContribution[]): void {
  // Create a contribution.txt file
  fs.writeFileSync(
    path.join(config.folderName, "contribution.txt"),
    `Contribution by ${config.githubUsername}\nTimestamp: ${config.timestamp}\n\nEntropy was generated using a secure method and has been deleted.`
  );

  // Generate attestation file
  console.log("\nGenerating attestation file...");
  const attestationPath = path.join(config.folderName, "attestation.json");

  // Create attestation data
  const attestationData = {
    contributor: config.githubUsername,
    contributionNumber: config.contributionNumber,
    timestamp: config.timestamp,
    files: contributions,
  };

  // Write attestation file
  fs.writeFileSync(attestationPath, JSON.stringify(attestationData, null, 2));

  console.log(`✅ Attestation generated at ${attestationPath}`);
}

function performContributions(config: ContributionConfig, lastFolder: string): ZkeyContribution[] {
  const zkeyFiles = getZkeyFiles(lastFolder);

  if (zkeyFiles.length === 0) {
    throw new Error(`No .zkey files found in ${lastFolder}`);
  }

  console.log(`Found ${zkeyFiles.length} zkey files to contribute to.`);

  // Generate base entropy
  const additionalEntropy = collectAdditionalEntropy();
  const mainEntropy = generateSecureEntropy();
  const baseEntropy = mainEntropy + additionalEntropy;
  console.log("Secure entropy generated (not displayed for security)");

  // Process each zkey file with unique entropy derived from the base entropy
  return zkeyFiles.map((zkeyFile) => {
    // For each file, we'll use a unique entropy derived from the base
    const fileSpecificEntropy = baseEntropy + zkeyFile;
    return contributeToZkey(zkeyFile, lastFolder, config, fileSpecificEntropy);
  });
}

function runContributionCeremony(): ContributionResult {
  // Setup the contribution environment
  const config = setupContribution();

  // Find the previous contribution folder
  const contributionFolders = getContributionFolders();
  const lastFolder = contributionFolders[contributionFolders.length - 2]; // -2 because we just created a new one

  // Process all zkey files
  const contributions = performContributions(config, lastFolder);

  // Create metadata files
  createMetadataFiles(config, contributions);

  return { config, contributions };
}

function main(): void {
  try {
    const result = runContributionCeremony();

    console.log(`\nAll contributions complete! Your contributions are in the ${result.config.folderName} folder.`);
    console.log("Please commit and push this folder to the repository.");
    console.log("\n⚠️ IMPORTANT: For security, entropy values were NOT saved anywhere and should now be gone from memory.");
    console.log("This is an important security feature of the trusted setup ceremony.");
  } catch (error) {
    console.error("Error during contribution process:", error);
    process.exit(1);
  }
}

main();
