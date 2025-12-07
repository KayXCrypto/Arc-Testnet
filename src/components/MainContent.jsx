import React, { useState } from 'react';
import TabNavigation from './TabNavigation';
import StatsCards from './StatsCards';
import EModePromoBanner from './EModePromoBanner';
import AssetControls from './AssetControls';
import AssetTable from './AssetTable';
import { mockAssets } from '../data/mockData';
import AssetTabBottom from './AssetTabBottom';
import ContactFooter from './ContactFooter';

const MainContent = () => {
  const [activeTab, setActiveTab] = useState('assets');
  const [searchTerm, setSearchTerm] = useState('');
  const [pausedAssets, setPausedAssets] = useState(false);

  const filteredAssets = mockAssets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <main className="flex-1 p-8 bg-gray-950">
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <StatsCards />
        <EModePromoBanner />
        <AssetControls
          pausedAssets={pausedAssets}
          setPausedAssets={setPausedAssets}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <AssetTable assets={filteredAssets} />
        <AssetTabBottom />

      </main>
      <ContactFooter />
    </>
  );
};

export default MainContent;
