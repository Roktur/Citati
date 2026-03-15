
export enum QuoteStyle {
  MINIMAL = 'Minimalist',
  NATURE = 'Nature/Scenic',
  URBAN = 'Urban/Street',
  ABSTRACT = 'Abstract/Modern',
  CLASSIC = 'Classic/Elegant',
  CYBERPUNK = 'Cyberpunk/Neon',
  SOCIAL = 'Social/Lifestyle',
  MORNING = 'Morning/Serene',
  DAYTIME = 'Daytime/Inspiring'
}

export interface QuoteProject {
  id: string;
  text: string;
  style: QuoteStyle;
  imageUrl?: string;
  fontSize: number;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  fontFamily: string;
}