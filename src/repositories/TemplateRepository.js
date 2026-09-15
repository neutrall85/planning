import { Repository } from './Repository';

export class TemplateRepository extends Repository {
  constructor(templates) {
    super(templates);
  }

  findByKind(kind) {
    return this.find(t => t.kind === kind);
  }

  findByOwner(ownerId) {
    return this.find(t => t.ownerId === ownerId);
  }
}