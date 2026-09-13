// src/services/HoursRequestService.js
export class HoursRequestService {
  constructor(requestRepo, notifyCallback) {
    this._requestRepo = requestRepo;
    this._notify = notifyCallback;
  }

  addRequest(req) {
    this._requestRepo.save(req);
    this._notify();
  }

  getAll() {
    return this._requestRepo.findAll();
  }
}