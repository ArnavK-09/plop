#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const prompts = require('prompts');

async function getTemplateFiles() {
  try {
    const localFiles = await fs.readdir(path.resolve(__dirname, 'template-files'));
    const remoteConfigPath = path.resolve(__dirname, 'remote-templates.json');
    let remoteTemplates = [];
    
    try {
      const remoteConfig = JSON.parse(await fs.readFile(remoteConfigPath, 'utf8'));
      remoteTemplates = remoteConfig.templates.map(t => ({ 
        ...t, 
        isRemote: true 
      }));
    } catch (e) {
      console.warn('No remote templates found or invalid config');
    }

    return [
      ...localFiles.map(f => ({ filename: f, isRemote: false })),
      ...remoteTemplates
    ];
  } catch (error) {
    console.error('Error reading template files:', error.message);
    process.exit(1);
  }
}

async function selectFile(files) {
  const response = await prompts({
    type: 'autocomplete',
    name: 'file',
    message: 'Select a file to copy:',
    choices: files.map(file => ({ 
      title: file.filename + (file.isRemote ? ' (remote)' : ''),
      value: file
    })),
  });

  return response.file;
}

async function copyFile(template) {
  const destinationPath = path.join(process.cwd(), template.filename);

  try {
    if (template.isRemote) {
      const response = await fetch(template.url);
      const content = await response.text();
      await fs.writeFile(destinationPath, content);
      console.log(`Remote file "${template.filename}" downloaded successfully to the current directory.`);
    } else {
      const sourcePath = path.resolve(__dirname, 'template-files', template.filename);
      await fs.copyFile(sourcePath, destinationPath);
      console.log(`File "${template.filename}" copied successfully to the current directory.`);
    }
  } catch (error) {
    console.error('Error copying/downloading file:', error.message);
  }
}

async function main() {
  const files = await getTemplateFiles();
  const selectedFile = await selectFile(files);

  if (selectedFile) {
    await copyFile(selectedFile);
  } else {
    console.log('No file selected. Exiting...');
  }
}

main();
