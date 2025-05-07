'use client';
import Textfit from '@namhong2001/react-textfit';
import Link from 'next/link';
import { useState } from 'react';

type DropdownState = {
  [key: string]: boolean;
};

const navItems = [
  { label: 'Home', href: '/dss/home' },
  { label: 'About', href: '/dss/about' },
  { label: 'Basic Module', href: '/dss/basic' },
  {
    label: 'GWM',
    full: 'Ground Water Management',
    submenu: [
      {
        label: 'Groundwater Potential Assessment',
        nestedMenu: [
          { label: 'Pumping Location Identification', href: '#' },
          { label: 'GW Potential Zone', href: '#' }
        ]
      },
      {
        label: 'Resource Estimation',
        nestedMenu: [
          { label: 'Regional Scale Quantification', href: '#' },
          { label: 'Water Quality Assessment', href: '#' },
          { label: 'Identification Of Vulnerable zones', href: '#' }
        ]
      },
      {
        label: 'Managed Aquifer Recharge',
        nestedMenu: [
          { label: 'Ground Water Assessment', href: '#' },
          { label: 'Surface Water Assessment', href: '#' },
          { label: ' Climate Change', href: '#' },
          { label: 'Optimized Solution', href: '#' }
        ]
      }
    ]
  },
  {
    label: 'RWM',
    full: 'River Water Management',
    submenu: [
      {
        label: 'Resource Estimation',
        nestedMenu: [
          { label: 'Water Availability', href: '#' },
          { label: 'Water Flow and Storage Estimation', href: '#' },
          { label: 'Water Quality Assessment', href: '#' },
          { label: 'Vulnerability Assessment', href: '#' },
          { label: 'Contamination Risk Assessment', href: '#' }
        ]
      },
      {
        label: 'Flood Forecasting and Managment',
        nestedMenu: [
          { label: 'Flood Simulation', href: '#' },
          { label: 'River Routing', href: '#' },
          { label: 'Contamination Transport Modelling', href: '#' }
        ]
      },
      {
        label: 'Water Bodies Management',
        nestedMenu: [
          { label: 'Storage and Forecasting', href: '#' },
          { label: 'Climate Change', href: '#' },
          { label: 'Reservoir Operation', href: '#' },
          { label: 'Water Quality and Monitoring', href: '#' }
        ]
      },
      {
        label: 'Waste Water Treatment',
        nestedMenu: [
          { label: 'Water Pollution and Inventory', href: '#' },
          { label: 'Site Priority and Suitability', href: '#' },
          { label: 'Treatment Technology', href: '#' }
        ]
      }
    ]
  },
  {
    label: 'WRM',
    full: 'Water Resource Management',
    submenu: [
      {
        label: 'Demand Forecasting',
        nestedMenu: [
          { label: 'Current Consumption Pattern', href: '#' },
          { label: 'Future Demand Projection', href: '#' }
        ]
      },
      {
        label: 'Resource Allocation',
        nestedMenu: [
          { label: 'Source Sustainability', href: '#' },
          { label: 'Source Demarcation', href: '#' }
        ]
      }
    ]
  },
  {
    label: 'System Dynamics',
    full: 'Hydrological System Dynamics',
    submenu: [
      {
        label: 'Resource Management',
        nestedMenu: [
          { label: 'Optimum and Sustainable Management', href: '#' },
          { label: 'Sensitive Socio-Economic Factors', href: '#' },
          { label: 'System Dynamics Modelling', href: '#' },
        ]
      },
      {
        label: 'Impact Assessment',
        nestedMenu: [
          { label: 'Plant Solutions', href: '#' },
          { label: 'Optimization Framework', href: '#' }
        ]
      }
    ]
  },
  {
    label: 'Activities',
    submenu: [
      { label: 'Training and Workshop', href: '/activities/training' },
      { label: 'Gallery', href: '/activities/gallery' }
    ]
  },
  {
    label: 'Report and Publication',
    submenu: [
      { label: 'Newsletter', href: '/reports/newsletter' },
      { label: 'Brochure', href: '/reports/brochure' }
    ]
  },
  {
    label: 'Visualization',
    submenu: [
      { label: 'Vector', href: '/dss/vector_visual' },
      { label: 'Raster', href: '/visualization/raster' }
    ]
  },
  {
    label: 'Contact',href:'/dss/contact'
  },
];

const accountMenu = ['Sign Up', 'Sign In', 'Log Out'];

export default function ResponsiveNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(null);

  const toggleDropdown = (label: string) => {
    // Check if running in browser environment
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 1024) { // mobile view
        setOpenMobileSubmenu(prev => prev === label ? null : label);
      } else {
        setActiveDropdown(prevActive => prevActive === label ? null : label);
      }
    } else {
      // Fallback for server-side rendering
      setOpenMobileSubmenu(prev => prev === label ? null : label);
    }
  };

  return (
    <nav className="bg-blue-900 text-white shadow-md w-full z-1000 py-0">
      {/* Top Container */}
      <div className="max-w-screen-xl mx-auto px-4 py-0">
        <div className="flex justify-between items-center ">
          {/* Hamburger menu button - mobile only */}
          <div className="lg:hidden">
            <button onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>

          {/* Account button - always visible, separate from hamburger */}
          <div className="ml-auto lg:hidden">
            <div className="relative">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="text-sm font-medium hover:text-yellow-300 mr-0"
              >
                               {/* User/Account Icon SVG */}
                               <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </button>
              {accountOpen && (
                <ul className="absolute right-0 mt-2 w-max bg-white text-black rounded shadow-md z-1000">
                  {accountMenu.map((item, index) => (
                    <li key={index} className="px-4 py-2 hover:bg-gray-200 whitespace-nowrap">
                      <Link href="#">{item}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Menu container for desktop */}
        <div className={menuOpen ? 'block lg:flex lg:flex-wrap lg:items-center lg:justify-between pb-3' : 'hidden lg:flex lg:flex-wrap lg:items-center lg:justify-between pb-3'}>
          {/* Mobile specific menu */}
          <div className="lg:hidden w-full mt-3">
            {menuOpen && (
              <div className="flex flex-col space-y-1 border-t border-blue-700 pt-2">
                {navItems.map((item, idx) => (
                  <div key={idx} className="w-full">
                    <div
                      className="flex justify-between items-center px-2 py-1 hover:bg-blue-800 cursor-pointer"
                      onClick={() => item.submenu && toggleDropdown(item.label)}
                    >
                      <Link
                        href={item.href || '#'}
                        className="font-medium text-blue "
                        onClick={(e) => {
                          if (item.submenu) {
                            e.preventDefault();
                          } else {
                            // Close the hamburger menu when clicking a link without submenu
                            setMenuOpen(false); // Add this line
                          }
                        }}
                      >
                        {item.label} {item.full && <span className="text-xs text-yellow-300">({item.full})</span>}
                      </Link>
                      {item.submenu && (
                        <svg
                          className={openMobileSubmenu === item.label ? 'w-4 h-4 transition-transform transform rotate-180' : 'w-4 h-4 transition-transform'}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      )}
                    </div>

                    {item.submenu && openMobileSubmenu === item.label && (
                      <div className="bg-blue-950 pl-4">
                        {item.submenu.map((sub: any, i) => {
                          if (typeof sub === 'string') {
                            return (
                              <div key={i} className="py-2 px-2">
                                <Link href="#" className="text-white hover:text-yellow-300" onClick={() => setMenuOpen(false)}>
                                  {sub}
                                </Link>
                              </div>
                            );
                          } else if (sub.label && !sub.nestedMenu) {
                            return (
                              <div key={i} className="py-2 px-2">
                                <Link href={sub.href || '#'} className="text-blue hover:text-yellow-300" onClick={() => setMenuOpen(false)}>
                                  {sub.label}
                                </Link>
                              </div>
                            );
                          } else {
                            return (
                              <div key={i} className="py-2 px-2">
                                <div className="flex items-center justify-between cursor-pointer text-blue hover:text-yellow-300">
                                  <span>{sub.label}</span>
                                </div>
                                {sub.nestedMenu && (
                                  <div className="pl-4 mt-1 space-y-1">
                                    {sub.nestedMenu.map((nested, j) => (
                                      <div key={j} className="py-1">
                                        <Link href={nested.href} className="text-white hover:text-yellow-300 text-sm" onClick={() => setMenuOpen(false)}>
                                          {nested.label}
                                        </Link>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {/* Mobile account menu */}
                <div className="border-t border-blue-700 pt-2 px-2">
                  <div className="font-medium text-white mb-2">Account</div>
                  {accountMenu.map((item, idx) => (
                    <div key={idx} className="py-1">
                      <Link href="#" className="text-white hover:text-yellow-300">{item}</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex lg:items-center w-full max-w-[100%]">
            <div className="lg:flex lg:flex-wrap lg:items-center lg:flex-1">
              {navItems.map((item, idx) => (
                <div
                  key={idx}
                  className="relative py-1 group lg:mx-1 "
                  onMouseEnter={() => typeof window !== 'undefined' && window.innerWidth >= 1024 && setActiveDropdown(item.label)}
                  onMouseLeave={() => typeof window !== 'undefined' && window.innerWidth >= 1024 && setActiveDropdown(null)}
                  onClick={() => item.submenu && toggleDropdown(item.label)}
                >
                  <div className="tooltip-container relative inline-block px-2 py-1  ">
                    <Textfit
                      mode="single"
                      max={18}
                      min={10}
                      className="font-bold hover:text-yellow-300 transition-colors duration-200 text-xs leading-tight"
                    >
                      <Link href={item.href || '#'} className="tooltip-trigger whitespace-nowrap">
                        {item.label}
                      </Link>
                    </Textfit>

                    {item.full && (
                      <div
                        className="absolute top-[-35px] left-1/2 transform -translate-x-1/2 bg-orange-500 bg-opacity-90 text-white px-2 py-0.5 rounded-md text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 after:content-[''] after:absolute after:top-full after:left-1/2 after:ml-[-5px] after:border-[5px] after:border-solid after:border-t-blue-900 after:border-r-transparent after:border-b-transparent after:border-l-transparent"
                      >
                        {item.full}
                      </div>
                    )}
                  </div>

                  {item.submenu && (
                    <ul
                      className={(activeDropdown === item.label || openMobileSubmenu === item.label)
                        ? 'w-full bg-white text-black rounded shadow-md z-10 transition-opacity duration-300 opacity-100 visible lg:absolute lg:left-0 lg:mt-1 lg:w-max'
                        : 'w-full bg-white text-black rounded shadow-md z-10 transition-opacity duration-300 opacity-0 invisible lg:absolute lg:left-0 lg:mt-1 lg:w-max'}
                    >
                      {item.submenu.map((sub: any, i) => {
                        if (typeof sub === 'string') {
                          return (
                            <li key={i} className="block px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50 hover:bg-opacity-10 rounded-md transition duration-200">
                              <Link href="#">{sub}</Link>
                            </li>
                          );
                        } else if (sub.label && !sub.nestedMenu) {
                          return (
                            <li key={i} className="block px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50 hover:bg-opacity-10 rounded-md transition duration-200">
                              <Link href={sub.href || '#'}>{sub.label}</Link>
                            </li>
                          );
                        } else {
                          // It's an object with label and possibly nestedMenu
                          return (
                            <li key={i} className=" block px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50 hover:bg-opacity-10 rounded-md transition duration-200whitespace-nowrap relative group/nested mb-0">
                              <div className="flex items-center text-blue justify-between cursor-pointer">
                                <span>{sub.label}</span>
                                {sub.nestedMenu && (
                                  <svg className="w-4 h-4 ml-2 lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                  </svg>
                                )}
                              </div>
                              {sub.nestedMenu && (
                                <ul className="w-full bg-white text-blue rounded shadow-md opacity-0 invisible group-hover/nested:opacity-100 group-hover/nested:visible transition-opacity duration-300 z-20 pl-4 lg:pl-0 lg:absolute lg:left-full lg:top-0 lg:w-max">
                                  {sub.nestedMenu.map((nested, j) => (
                                    <li key={j} className="block px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50 hover:bg-opacity-10 rounded-md transition duration-200">
                                      <Link href={nested.href}>{nested.label}</Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        }
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Account on desktop - reduced spacing */}
            <div className="hidden lg:block relative py-2 ml-0 mr-0 z-1000000">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="text-sm font-medium hover:text-yellow-300"
              >
                {/* User/Account Icon SVG */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </button>
              {accountOpen && (
                <ul className="absolute right-0 mt-2 w-max bg-white text-black rounded shadow-md z-1000000">
                  {accountMenu.map((item, index) => (
                    <li key={index} className="block px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50 hover:bg-opacity-10 rounded-md transition duration-200 whitespace-nowrap overflow:auto z-100000">
                      <Link href="#">{item}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu styles */}
      <style jsx>{`
        @media (max-width: 1024px) {
          nav li {
            margin-bottom: 0  !important;
          }
          nav .group, nav .group/nested {
            width: 100%;
          }
        }
      `}</style>

      <style jsx>{`
        /* Tooltip styles */
        .tooltip-trigger:hover + .tooltip,
        .tooltip-trigger:focus + .tooltip {
          opacity: 1 !important;
          visibility: visible !important;
        }
        .tooltip-container:hover .tooltip {
          opacity: 1 !important;
          visibility: visible !important;
          color: red;
        }
      `}</style>
    </nav>
  );
}