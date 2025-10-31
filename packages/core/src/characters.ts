/**
 * Character registry loader with hot reload support
 * Loads consultant characters from config/characters.json
 * Supports runtime reloading without server restart
 */

import fs from "node:fs";
import Ajv from "ajv";
// Remove circular import - use console for now
import { deepmerge } from "./utils"; // Import deepmerge

export type Service = "interior_design" | "construction" | "home_automation" | "painting" | "solar_services" | "electrical_services";

// Module-level path variables, to be configured by the application
let REGISTRY_PATH: string | null = null;
let SCHEMA_PATH: string | null = null;

/**
 * Initializes the character loader with necessary file paths.
 * This must be called by the application at startup.
 */
export function initCharacterLoader(registryPath: string, schemaPath:string): void {
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Character registry not found at provided path: ${registryPath}`);
  }
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Character schema not found at provided path: ${schemaPath}`);
  }
  REGISTRY_PATH = registryPath;
  SCHEMA_PATH = schemaPath;
  console.info(`Character loader initialized with registry: ${REGISTRY_PATH}`);
}


// In-memory cache
let cache: any = null;
let mtime = 0;

/**
 * Validate registry using AJV (JSON Schema validation)
 */
function validateWithAjv(registry: any): void {
  if (!SCHEMA_PATH) throw new Error('Character loader not initialized. Call initCharacterLoader() first.');
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  
  if (!validate(registry)) {
    const errors = validate.errors?.map(e => `${e.instancePath || ''} ${e.message}`).join(", ");
    throw new Error(`Character registry validation failed: ${errors}`);
  }
}

/**
 * Validate registry using Zod (runtime type checking)
 * Note: Requires generated Zod schema from tools/gen-zod-types.ts
 */
function validateWithZod(_registry: any): void {
  try {
    // Import dynamically to avoid circular dependencies
    // const { characterRegistrySchema } = require('./character-registry.zod');
    // characterRegistrySchema.parse(registry);
    
    // For now, skip Zod validation if schema isn't generated yet
    // Will be enabled once gen:zod is run
  } catch (error) {
    // Schema file doesn't exist yet - skip Zod validation
    // This is expected on first run before gen:zod
  }
}

/**
 * Load raw registry from disk with caching
 */
function loadRaw(): any {
  if (!REGISTRY_PATH) throw new Error('Character loader not initialized. Call initCharacterLoader() first.');
  try {
    // Check if file has been modified
    const stat = fs.statSync(REGISTRY_PATH);
    const nowMtime = +stat.mtime;

    // Return cached version if file hasn't changed
    if (cache && mtime === nowMtime) {
        console.debug(`Returning cached character registry from: ${REGISTRY_PATH}`);
      return cache;
    }

    // Read and parse registry
    const rawContent = fs.readFileSync(REGISTRY_PATH, "utf8");
        console.debug(`Read character registry from: ${REGISTRY_PATH}, content length: ${rawContent.length}`);
    const registry = JSON.parse(rawContent);

    // Validate
    validateWithAjv(registry);
    validateWithZod(registry);

    // Update cache
    cache = registry;
    mtime = nowMtime;

        console.info(`Successfully loaded character registry from: ${REGISTRY_PATH}`);
    return cache;
  } catch (error: any) {
    console.error(`Failed to load character registry from ${REGISTRY_PATH}: ${error.message}`);
    throw new Error(`Failed to load character registry: ${error.message}`);
  }
}

/**
 * Load complete character registry
 */
export function loadCharacters(): any {
  return loadRaw();
}

/**
 * Pick a character for a specific service
 * Merges character config with defaults
 */
export function pickCharacter(service: Service): any {
  const registry = loadRaw();
  const character = registry.characters.find((c: any) => c.service === service);

  if (!character) {
    throw new Error(`Character for service ${service} not found`);
  }

  // Apply global defaults if they exist
  const defaults = registry.defaults || {};
  const merged = deepmerge(defaults, character);
  
  // Debug logging
  console.log('DEBUG pickCharacter: defaults.language.secondary:', defaults.language?.secondary);
  console.log('DEBUG pickCharacter: character.language.secondary:', character.language?.secondary);
  console.log('DEBUG pickCharacter: merged.language.secondary:', merged.language?.secondary);
  console.log('DEBUG pickCharacter: Array.isArray(merged.language.secondary):', Array.isArray(merged.language?.secondary));
  
  return merged;
}

/**
 * Force reload characters from disk
 * Useful for admin endpoints or manual refresh
 */
export function forceReloadCharacters(): any {
  cache = null;
  mtime = 0;
  return loadRaw();
}