import { inject, injectable } from 'tsyringe';
import { resolve } from 'path';
import fs from 'fs';
import AppError from '@shared/errors/AppError';

import Application from '@modules/users/infra/Typeorm/entities/Application';
import IStorageProvider from '@shared/container/providers/StorageProvider/models/IStorageProvider';
import IVacanciesRepository from '@modules/vacancies/repositories/IVacanciesRepository';
import uploadConfig from '@config/upload';
import IUsersRepository from '../repositories/IUsersRepository';
import IApplicationsRepository from '../repositories/IApplicationsRepository';

interface IRequest {
  userId: string;
  linkedin: string;
  curriculumn: string;
  vacancyId: string;
}

@injectable()
class CreateUserApplicationService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
    @inject('ApplicationsRepository')
    private applicationsRepository: IApplicationsRepository,
    @inject('StorageProvider')
    private storageProvider: IStorageProvider,
    @inject('VacanciesRepository')
    private vacanciesRepository: IVacanciesRepository,
  ) {}

  public async execute({ userId, vacancyId, linkedin, curriculumn }: IRequest): Promise<Application> {
    const user = await this.usersRepository.findById(userId);

    const originalPath = resolve(uploadConfig.tmpFolder, curriculumn);

    if (!user) {
      await fs.promises.unlink(originalPath);
      throw new AppError('Only authenticated users can apply to vacancies!', 401);
    }

    const checkVacancie = await this.vacanciesRepository.findById(vacancyId);

    if (!checkVacancie) {
      await fs.promises.unlink(originalPath);
      throw new AppError('Vacancie not found', 404);
    }

    const checkApplication = await this.applicationsRepository.findByUserIdAndVacancyId(userId, vacancyId);

    if (checkApplication) {
      await fs.promises.unlink(originalPath);
      throw new AppError('You already applied for this vacancie!', 409);
    }

    const fileName = await this.storageProvider.saveFile(curriculumn);

    const application = await this.applicationsRepository.create({
      userId,
      vacancyId,
      linkedin,
      curriculumn: fileName,
    });

    return application;
  }
}

export default CreateUserApplicationService;
