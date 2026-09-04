import * as settingsService from '../services/businessSettings.js';

export async function getBusinessSettings(req, res) {
  res.json(await settingsService.getBusinessSettings());
}

export async function updateBusinessSettings(req, res) {
  res.json(await settingsService.updateBusinessSettings(req.validatedBody));
}
