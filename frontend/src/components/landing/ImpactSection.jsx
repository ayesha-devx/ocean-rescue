import React from 'react';

export const ImpactSection = () => {
  const impactCards = [
    {
      icon: 'shield',
      iconColor: 'text-primary',
      title: 'Protect Marine Life',
      description:
        'Ghost nets continue trapping turtles, cetaceans, and fish indiscriminately. Recovering derelict gear directly halts unbroken cycles of underwater mortality.',
    },
    {
      icon: 'recycling',
      iconColor: 'text-secondary',
      title: 'Stem Microplastic Infiltration',
      description:
        'Nets left in reefs abrade under wave action, releasing billions of microfibers into marine food chains. Retrieval ensures synthetic materials are responsibly repurposed.',
    },
    {
      icon: 'speed',
      iconColor: 'text-primary',
      title: 'Smarter Recovery Operations',
      description:
        "Vessel fuel, diver safety windows, and daylight hours are precious. OceanRescue's predictive routing maximizes the effectiveness of every maritime excursion.",
    },
  ];

  return (
    <section id="impact" className="w-full bg-surface-container-low px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-16 md:py-20 lg:py-28 flex flex-col">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto w-full">
        {/* Centered Section Header */}
        <div className="flex flex-col mb-10 md:mb-16 text-center items-center max-w-3xl mx-auto">
          <span className="font-label-md text-xs sm:text-sm text-secondary uppercase tracking-widest font-bold mb-2.5">
            Conservation Stewardship
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-5xl text-on-surface leading-tight font-semibold mb-3">
            Every Recovery Can Make a Difference
          </h2>
          <p className="font-jakarta font-body-sm text-base sm:text-lg lg:text-xl text-on-surface-variant leading-relaxed">
            Purpose-built tech to deliver grounded, measurable ecological relief.
          </p>
        </div>

        {/* 3 Impact Cards Across Full Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full">
          {impactCards.map((card) => (
            <div
              key={card.title}
              className="bg-surface-container-lowest p-8 sm:p-10 rounded-3xl shadow-xs flex flex-col items-start gap-4 border border-surface-container/70 hover:shadow-xl hover:border-primary-container/60 transition-all h-full"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center ${card.iconColor} mb-1 flex-shrink-0`}
              >
                <span className="material-symbols-outlined text-[30px]">{card.icon}</span>
              </div>
              <h3 className="font-title-lg text-xl sm:text-2xl text-on-surface font-bold">{card.title}</h3>
              <p className="font-body-sm text-base sm:text-lg text-on-surface-variant leading-relaxed flex-grow">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImpactSection;
