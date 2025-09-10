import * as tar from "tar-stream";
import { Readable } from 'stream'
import { gunzipSync } from "fflate";
import { logger } from '@webpm/logger'
import type { ResolvedPackage } from './index'

export interface ExtractedFile {
  name: string;
  buffer: Buffer;
  size: number;
  type: string;
  mode?: number;
  mtime?: Date;
}

export interface ExtractionResult {
  files: ExtractedFile[];
  manifest?: Record<string, unknown>;
  hasInstallScript: boolean;
}

export interface FetchedPackage {
  package: ResolvedPackage;
  extractedFiles: ExtractionResult;
  tarballBuffer: ArrayBuffer;
  integrity: string;
  timings: {
    fetchTime: number;
    extractionTime: number;
    totalTime: number;
  };
}

export class TarballFetcher {
  private cache = new Map<string, FetchedPackage>();

  /**
   * Fetch and extract a package tarball
   */
  async fetchPackage(resolvedPackage: ResolvedPackage): Promise<FetchedPackage | null> {
    const packageId = resolvedPackage.id;
    const totalTimer = performance.now();
    
    // Check cache first
    if (this.cache.has(packageId)) {
      logger.debug(`Package ${packageId} already fetched and cached`);
      return this.cache.get(packageId)!;
    }

    try {
      logger.debug(`Fetching tarball for package: ${packageId}`);
      
      // Fetch the tarball
      const fetchTimer = performance.now();
      const tarballBuffer = await this.fetchTarball(resolvedPackage.resolution.tarball);
      const fetchTime = performance.now() - fetchTimer;
      
      if (!tarballBuffer) {
        logger.error(`Failed to fetch tarball for ${packageId}`);
        return null;
      }

      // Extract the tarball
      const extractionTimer = performance.now();
      const extractedFiles = await this.extractTarball(tarballBuffer);
      const extractionTime = performance.now() - extractionTimer;

      const dTsFiles = extractedFiles?.files.filter(file => file.name.endsWith('.d.ts'));
      console.log('dTsFiles', dTsFiles);
      if (!extractedFiles) {
        logger.error(`Failed to extract tarball for ${packageId}`);
        return null;
      }

      // Calculate integrity
      const integrity = await this.calculateIntegrity(tarballBuffer);

      const totalTime = performance.now() - totalTimer;

      const fetchedPackage: FetchedPackage = {
        package: resolvedPackage,
        extractedFiles,
        tarballBuffer,
        integrity,
        timings: {
          fetchTime,
          extractionTime,
          totalTime,
        },
      };

      // Cache the result
      this.cache.set(packageId, fetchedPackage);
      
      logger.debug(`Successfully fetched and extracted package: ${packageId} in ${totalTime.toFixed(2)}ms (fetch: ${fetchTime.toFixed(2)}ms, extract: ${extractionTime.toFixed(2)}ms)`);
      return fetchedPackage;

    } catch (error) {
      const totalTime = performance.now() - totalTimer;
      logger.error(`Failed to fetch package ${packageId} after ${totalTime.toFixed(2)}ms:`, error);
      return null;
    }
  }

  /**
   * Fetch tarball from URL
   */
  private async fetchTarball(tarballUrl: string): Promise<ArrayBuffer | null> {
    try {
      logger.debug(`Fetching tarball from: ${tarballUrl}`);
      
      const response = await fetch(tarballUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      logger.debug(`Fetched tarball, size: ${arrayBuffer.byteLength} bytes`);
      
      return arrayBuffer;

    } catch (error) {
      logger.error(`Failed to fetch tarball from ${tarballUrl}:`, error);
      return null;
    }
  }

  /**
   * Extract tarball and return files
   */
  private async extractTarball(tarballBuffer: ArrayBuffer): Promise<ExtractionResult | null> {
    try {
      logger.debug("Extracting tarball using tar-stream...");

      const files: ExtractedFile[] = [];
      let manifest: Record<string, unknown> | null = null;
      let hasInstallScript = false;

      return new Promise((resolve, reject) => {
        console.log('extract', tar)
        const extract = tar.extract();

        extract.on("entry", (header, stream, next) => {
          // Skip directories
          if (header.type === "directory") {
            stream.resume(); // drain the stream
            next();
            return;
          }

          const chunks: Buffer[] = [];

          stream.on("data", (chunk) => {
            chunks.push(chunk);
          });

          stream.on("end", () => {
            const fileBuffer = Buffer.concat(chunks);

            const extractedFile: ExtractedFile = {
              name: header.name,
              buffer: fileBuffer,
              size: header.size || fileBuffer.length,
              type: header.type || "file",
              mode: header.mode,
              mtime: header.mtime,
            };

            files.push(extractedFile);

            // Check for package.json (manifest)
            if (
              header.name.endsWith("package.json") &&
              header.name.split("/").length === 2
            ) {
              try {
                const manifestText = fileBuffer.toString("utf8");
                manifest = JSON.parse(manifestText);

                // Check for install scripts
                if (
                  manifest.scripts &&
                  (manifest.scripts.preinstall ||
                    manifest.scripts.install ||
                    manifest.scripts.postinstall)
                ) {
                  hasInstallScript = true;
                }
              } catch (error) {
                logger.warn("Failed to parse package.json:", error);
              }
            }

            next();
          });

          stream.on("error", (error) => {
            logger.warn(`Error processing entry ${header.name}:`, error);
            next();
          });
        });

        extract.on("finish", () => {
          logger.debug(`Extracted ${files.length} files from tarball`);
          resolve({
            files,
            manifest,
            hasInstallScript,
          });
        });

        extract.on("error", (error) => {
          logger.error("Failed to extract tarball:", error);
          reject(error);
        });

        // Convert ArrayBuffer to Uint8Array for fflate
        const uint8Array = new Uint8Array(tarballBuffer);

        // Decompress gzipped data using fflate
        let decompressedData: Uint8Array;
        try {
          // Try to decompress as gzip first
          decompressedData = gunzipSync(uint8Array);
        } catch {
          // If it fails, assume it's already uncompressed tar data
          decompressedData = uint8Array;
        }

        // Convert back to Buffer and create readable stream
        const buffer = Buffer.from(decompressedData);
        const readable = new Readable({
          read() {
            this.push(buffer);
            this.push(null); // end the stream
          },
        });

        // Pipe directly to tar-stream extract
        readable.pipe(extract);
      });
    } catch (error) {
      logger.error("Failed to extract tarball:", error);
      return null;
    }
  }

  /**
   * Get file content as text
   */
  getFileAsText(file: ExtractedFile): string {
    return file.buffer.toString("utf8");
  }

  /**
   * Find specific file in extraction result
   */
  findFile(result: ExtractionResult, fileName: string): ExtractedFile | null {
    return (
      result.files.find(
        (file) => file.name.endsWith(fileName) || file.name.includes(fileName)
      ) || null
    );
  }

  /**
   * Get package structure from extracted files
   */
  getPackageStructure(result: ExtractionResult): Record<string, unknown> {
    const structure: Record<string, unknown> = {};

    for (const file of result.files) {
      const pathParts = file.name.split("/").slice(1); // Remove package folder prefix
      let current = structure;

      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }

      const fileName = pathParts[pathParts.length - 1];
      if (fileName) {
        current[fileName] = {
          size: file.size,
          type: file.type,
        };
      }
    }

    return structure;
  }

  /**
   * Calculate integrity hash (simplified)
   */
  private async calculateIntegrity(buffer: ArrayBuffer | Buffer): Promise<string> {
    try {
      // Convert Buffer to ArrayBuffer if needed
      const arrayBuffer =
        buffer instanceof Buffer
          ? buffer.buffer.slice(
              buffer.byteOffset,
              buffer.byteOffset + buffer.byteLength
            )
          : buffer;

      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer as ArrayBuffer);
      return `sha256-${btoa(
        String.fromCharCode(...new Uint8Array(hashBuffer))
      )}`;
    } catch (error) {
      logger.warn("Failed to calculate integrity:", error);
      return "";
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug("Tarball fetcher cache cleared");
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

export const tarballFetcher = new TarballFetcher();
