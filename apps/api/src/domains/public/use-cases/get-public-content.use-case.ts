import { PublicRepository } from '../ports/public.repository';
import { NotFoundError } from '../../../shared/errors';

export class GetPublicContentUseCase {
  constructor(private readonly pubRepo: PublicRepository) {}

  async getPage(slug: string): Promise<any> {
    const page = await this.pubRepo.getStaticPage(slug);
    if (!page) throw new NotFoundError('Page not found');
    return page;
  }

  async getFaqs(): Promise<any[]> {
    return this.pubRepo.getActiveFaqs();
  }
}
