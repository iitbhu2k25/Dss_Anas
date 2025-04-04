import GridSection from './component/home_grid/GridSection';
import GalleryCarousel from './component/project_images/GalleryCarousel';
import StepCardsGrid from './component/cards/StepCards.Grid';
import SocialGridSection from './component/social/social';
export default function Home() {
    return(<div>
      <GridSection/>
      <StepCardsGrid/>
      <SocialGridSection/>
      <GalleryCarousel/>
      main home page Page Content</div>);
  }
  