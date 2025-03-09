import * as fs from 'fs-extra';
import { execSync } from 'child_process';
import * as path from 'path';

function getDirectories(source: string): string[] {
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

function getZkeyFiles(directory: string): string[] {
  return fs.readdirSync(directory)
    .filter(file => file.endsWith('.zkey'));
}

function main(): void {
  // Get all contribution folders
  const folders = getDirectories('./');
  const contributionFolders = folders.filter(f => f.match(/^\d{4}_/));
  contributionFolders.sort();

  console.log(`Found ${contributionFolders.length} contributions`);

  if (contributionFolders.length < 2) {
    console.log("At least two contributions are needed for verification.");
    console.log("There's only the initial setup folder. Nothing to verify yet.");
    return;
  }

  // Get the circuit.r1cs file path from the initial folder
  const initialFolder = contributionFolders[0];
  const r1csFiles = fs.readdirSync(initialFolder)
    .filter(file => file.endsWith('.r1cs'));

  if (r1csFiles.length === 0) {
    console.error(`No .r1cs files found in ${initialFolder}`);
    return;
  }

  const circuitR1cs = path.join(initialFolder, r1csFiles[0]);
  console.log(`Using circuit definition: ${circuitR1cs}`);

  // Verify each contribution
  for (let i = 1; i < contributionFolders.length; i++) {
    const prevFolder = contributionFolders[i-1];
    const currentFolder = contributionFolders[i];

    console.log(`\nVerifying contributions in ${currentFolder}...`);

    // Get all zkey files from previous folder
    const zkeyFiles = getZkeyFiles(prevFolder);

    if (zkeyFiles.length === 0) {
      console.error(`No .zkey files found in ${prevFolder}`);
      continue;
    }

    // Verify each zkey file
    for (const zkeyFile of zkeyFiles) {
      const prevZkey = path.join(prevFolder, zkeyFile);
      const currentZkey = path.join(currentFolder, zkeyFile);

      // Check if the corresponding zkey exists in the current folder
      if (!fs.existsSync(currentZkey)) {
        console.error(`Corresponding zkey file ${zkeyFile} not found in ${currentFolder}`);
        continue;
      }

      console.log(`\nVerifying ${zkeyFile}...`);
      try {
        execSync(`snarkjs zkey verify ${circuitR1cs} ${prevZkey} ${currentZkey}`, {
          stdio: 'inherit'
        });
        console.log(`✅ ${zkeyFile} verification successful!`);
      } catch (error) {
        console.error(`❌ Failed to verify ${zkeyFile}`);
        if (error instanceof Error) {
          console.error(error.message);
        }
      }
    }
  }
}

main();