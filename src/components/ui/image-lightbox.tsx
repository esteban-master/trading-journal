import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

interface ImageLightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
}

export function ImageLightbox({ images, index, onClose }: ImageLightboxProps) {
  return (
    <Lightbox
      open={index >= 0}
      close={onClose}
      index={index}
      slides={images.map((src) => ({ src }))}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      carousel={{ finite: images.length <= 1 }}
      styles={{ root: { '--yarl__color_backdrop': 'rgba(0,0,0,0.92)' } }}
    />
  );
}
