// src/repositories/EmployeeRepository.js
import { Repository } from './Repository';

export class EmployeeRepository extends Repository {
  constructor(employees) {
    super(employees);
  }

  findByEmail(email) {
    return this.findOne(e => e.email.toLowerCase() === email.trim().toLowerCase());
  }
}