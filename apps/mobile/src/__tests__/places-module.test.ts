/**
 * The Swift module (K-1227, ADR-093) is compiled only by the EAS build; nothing here compiles it. What can be held under Jest is held:
 * the module is declared, it uses no location API, and the app asks for no location permission (the Apple Health text says it never
 * reads location, so that must stay true).
 */
import * as fs from 'fs';
import * as path from 'path';

const MODULE = path.resolve(__dirname, '../../modules/places');
const swift = fs.readFileSync(path.join(MODULE, 'ios/PlacesModule.swift'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(MODULE, 'expo-module.config.json'), 'utf8')) as { apple: { modules: string[] } };

test('the module is declared and has the two calls the JS side uses', () => {
  expect(config.apple.modules).toEqual(['PlacesModule']);
  expect(swift).toMatch(/Name\("Places"\)/);
  expect(swift).toMatch(/AsyncFunction\("search"\)/);
  expect(swift).toMatch(/AsyncFunction\("walkingRoute"\)/);
  expect(swift).toMatch(/getCoordinates/);
  expect(swift).toMatch(/\.walking/);
});

test('no code in it reads where the phone is', () => {
  const code = swift.replace(/\/\/.*$/gm, '');
  expect(code).not.toMatch(/CLLocationManager|requestWhenInUse|requestAlways|startUpdating|showsUserLocation|CLGeocoder/);
});

test('the app config asks for no location permission and carries no location plugin', () => {
  const appConfig = fs.readFileSync(path.resolve(__dirname, '../../app.config.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  expect(appConfig).not.toMatch(/NSLocation|expo-location|expo-maps/);
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')) as { dependencies: Record<string, string> };
  expect(pkg.dependencies).not.toHaveProperty('expo-location');
  expect(pkg.dependencies['react-native-maps']).toBe('1.27.2');
});
