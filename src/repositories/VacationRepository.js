// src/repositories/VacationRepository.js
import { Repository } from './Repository';

export class VacationRepository extends Repository {
  constructor(vacations) {
    super(vacations);
  }

  findByEmployee(empId) {
    return this.find(v => v.empId === empId);
  }
}