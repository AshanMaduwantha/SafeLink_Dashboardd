import React from "react";

import Image from "next/image";

interface HeroBannerProps {
  title: string;
  subtitle: string;
  buttonText: string;
  onButtonClick?: () => void;
}

const HeroBanner: React.FC<HeroBannerProps> = ({
  title,
  subtitle: _subtitle,
  buttonText,
  onButtonClick,
}) => {
  return (
    <div className="bg-center bg-cover bg-[url(https://doctor-on-call-main.s3.ap-southeast-2.amazonaws.com/public/bannerBg.png)] bg-blue-600 rounded-lg p-8 text-white relative overflow-hidden w-full flex items-center justify-between">
      {/* Background elements */}

      <div className="relative z-10 flex items-center">
        <div className="mr-8">
          <Image
            src="https://doctor-on-call-main.s3.ap-southeast-2.amazonaws.com/public/banner.png"
            alt="Man holding phone"
            width={150}
            height={150}
            className="rounded-full"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-4 max-w-xs">{title}</h1>
          <p className="text-sm mb-4 max-w-md">{_subtitle}</p>
          <button
            onClick={onButtonClick}
            className="bg-black text-white px-6 py-3 rounded-3xl font-bold  transition-all"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
