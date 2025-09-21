// Test file to verify webpm integration
import { webpm } from '@webpm/webpm';
import { runAllPackageJsonTests } from './test-package-json';

// Test basic webpm functionality
export async function testWebPM() {
  try {
    console.log('Testing webpm package validation...');
    
    // Test package name validation
    const validPackage = webpm.validatePackageName('lodash');
    console.log('lodash is valid:', validPackage);
    
    const invalidPackage = webpm.validatePackageName('invalid-package-name!');
    console.log('invalid package is valid:', invalidPackage);
    
    // Test package info fetching
    console.log('Fetching package info for lodash...');
    const packageInfo = await webpm.getPackageInfo('lodash');
    console.log('Package info:', packageInfo);
    
    return true;
  } catch (error) {
    console.error('WebPM test failed:', error);
    return false;
  }
}

// Test package.json resolution
export async function testPackageJsonResolution() {
  try {
    console.log('\n=== Testing package.json resolution ===');
    return await runAllPackageJsonTests();
  } catch (error) {
    console.error('Package.json resolution test failed:', error);
    return false;
  }
}

// Test TypeScript VFS integration
export async function testTypeScriptVFS() {
  try {
    const { createSystem, createDefaultMapFromCDN, createVirtualCompilerHost } = await import("@typescript/vfs");
    const ts = await import("typescript");
    
    console.log('Creating TypeScript VFS...');
    const fsMap = await createDefaultMapFromCDN(
      { target: ts.ScriptTarget.ES2022 }, 
      "5.9.2", 
      true, 
      ts
    );
    const system = createSystem(fsMap);
    
    console.log('TypeScript VFS created successfully');
    return true;
  } catch (error) {
    console.error('TypeScript VFS test failed:', error);
    return false;
  }
}

