import { execSync } from 'child_process';
import { join } from 'path';

export default async function (context) {
  const exePath = join(context.appOutDir, 'OpenReel Video.exe');
  const projectDir = context.packager.projectDir;
  const iconPath = join(projectDir, 'assets', 'icon.ico');
  const rcedit = join(projectDir, 'node_modules', '.pnpm', 'rcedit@5.0.2', 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');
  
  console.log('Applying custom icon...');
  console.log(`  exe: ${exePath}`);
  console.log(`  icon: ${iconPath}`);
  console.log(`  rcedit: ${rcedit}`);
  execSync(`"${rcedit}" "${exePath}" --set-icon "${iconPath}"`, { stdio: 'inherit' });
  console.log('Icon applied successfully');
}
