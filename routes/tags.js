/**
 * Tags Routes
 * API endpoints for tag management
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize tags routes with config
 */
function createTagsRoutes(CONFIG, utils) {
  const { readJsonFile } = utils.fileUtils;

  /**
   * GET /api/tags
   * Get all unique tags from registry
   */
  router.get('/', async (req, res) => {
    try {
      const tags = new Set();

      // Read registry
      const registry = await readJsonFile(CONFIG.registryFile, { skills: {} });

      // Collect all tags
      Object.values(registry.skills || {}).forEach(skill => {
        (skill.tags || []).forEach(tag => tags.add(tag));
      });

      res.json({
        tags: Array.from(tags).sort()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createTagsRoutes;
