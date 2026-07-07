const fs = require('fs');
const path = require('path');

/**
 * Resolves a saved file path from the database to a valid absolute local path.
 * Handles cases where the database stores absolute paths from a different environment (e.g. Render vs. local Windows).
 * 
 * @param {string} savedPath - The path saved in the database.
 * @param {string} subFolder - The subfolder within uploads (e.g. 'resumes', 'cover_letters', 'job_descriptions', 'voice_notes').
 * @returns {string} - The resolved absolute path.
 */
const resolveUploadPath = (savedPath, subFolder) => {
  if (!savedPath) return '';

  // 1. If it exists exactly as-is on the disk, return its absolute path
  if (fs.existsSync(savedPath)) {
    return path.resolve(savedPath);
  }

  // 2. Try to find the filename and look in the local uploads/subFolder directory
  const filename = path.basename(savedPath);
  const localResolvedPath = path.join(process.cwd(), 'uploads', subFolder, filename);
  if (fs.existsSync(localResolvedPath)) {
    return localResolvedPath;
  }

  // 3. Try to locate 'uploads/' in the saved path and build a relative path from process.cwd()
  const normalized = savedPath.replace(/\\/g, '/');
  const uploadsIndex = normalized.indexOf('uploads/');
  if (uploadsIndex !== -1) {
    const relativePath = normalized.substring(uploadsIndex);
    const resolvedPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  // Fallback to local resolved path so that Express can either serve it or fail standardly
  return localResolvedPath;
};

/**
 * Returns a relative path from the current working directory to store in the database.
 * Helps keep paths portable across environments.
 * 
 * @param {string} filePath - The absolute file path returned by multer.
 * @returns {string} - The relative path (e.g. 'uploads/resumes/filename.ext').
 */
const getRelativePath = (filePath) => {
  if (!filePath) return '';
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
};

/**
 * Proxies a file download from the production server if the file is missing locally in dev mode.
 * 
 * @param {string} url - The production API URL.
 * @param {string} authHeader - The Authorization header from the client request.
 * @param {object} res - The Express response object.
 * @returns {Promise<boolean>} - Resolves true if proxy succeeded, rejects otherwise.
 */
const proxyFromProduction = (url, authHeader, res) => {
  return new Promise((resolve, reject) => {
    const https = require('https');
    
    const options = {
      headers: {}
    };
    if (authHeader) {
      options.headers['Authorization'] = authHeader;
    }

    const req = https.get(url, options, (prodRes) => {
      if (prodRes.statusCode === 200) {
        res.setHeader('Content-Type', prodRes.headers['content-type'] || 'application/octet-stream');
        if (prodRes.headers['content-disposition']) {
          res.setHeader('Content-Disposition', prodRes.headers['content-disposition']);
        }
        prodRes.pipe(res);
        prodRes.on('end', () => resolve(true));
      } else {
        reject(new Error(`Production server returned status ${prodRes.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request to production server timed out'));
    });
  });
};

module.exports = {
  resolveUploadPath,
  getRelativePath,
  proxyFromProduction
};
