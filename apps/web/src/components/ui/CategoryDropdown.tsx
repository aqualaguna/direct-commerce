import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Dummy data structure based on the image
interface CategoryData {
  subcategories: {
    title: string;
    items: string[];
  }[];
  mainProducts?: string[];
}

const categoryData: Record<string, CategoryData> = {
  "PC & Laptop": {
    subcategories: [
      {
        title: "Laptop",
        items: ["Gaming Laptop", "Business Laptop", "Ultrabook", "2-in-1 Laptop"]
      },
      {
        title: "Desktop PC",
        items: ["Gaming PC", "Workstation", "All-in-One PC", "Mini PC"]
      },
      {
        title: "PC Components",
        items: ["Processor", "Motherboard", "RAM", "Graphics Card", "Storage", "Power Supply"]
      },
      {
        title: "PC Accessories",
        items: ["Monitor", "Keyboard", "Mouse", "Webcam", "Speaker", "Headset"]
      }
    ]
  },
  "Smartphone & Tablet": {
    subcategories: [
      {
        title: "Aksesoris Smartphone",
        items: [
          "Smartphone Casing",
          "Pernak Pernik Smartphone",
          "Smartphone Stand & Holder",
          "Smartphone Screen Protector",
          "Waterproof Case & Bag",
          "Aksesoris Kamera Smartphone"
        ]
      },
      {
        title: "Aksesoris Tablet",
        items: [
          "Tablet Case & Bag",
          "Tablet Stand & Holder",
          "Tablet Screen Protector",
          "Keyboard Tablet",
          "Pernak Pernik Tablet"
        ]
      },
      {
        title: "Aksesoris Tablet & Smartphone",
        items: [
          "Kabel Charger & Data",
          "Touch Pen / Stylus",
          "Cleaning Kit"
        ]
      },
      {
        title: "Baterai & Charger",
        items: [
          "Smartphone Charger",
          "Power Bank",
          "Baterai Smartphone",
          "Baterai Tablet"
        ]
      },
      {
        title: "Spare Part Smartphone & Tablet",
        items: [
          "Spare Part LCD Smartphone & Tablet",
          "Spare Part Keyboard Smartphone",
          "Spare Part Lainnya",
          "Peralatan Reparasi Smartphone & Tablet"
        ]
      },
      {
        title: "Kartu Perdana",
        items: [
          "Kartu GSM",
          "SIM Adapter",
          "Pemotong Kartu SIM"
        ]
      }
    ],
    mainProducts: ["Smartphone", "Tablet PC", "Handphone"]
  },
  "Electronic": {
    subcategories: [
      {
        title: "Audio & Video",
        items: ["Headphones", "Speakers", "TV", "Projector", "Sound System"]
      },
      {
        title: "Home Electronics",
        items: ["Air Conditioner", "Fan", "Heater", "Vacuum Cleaner"]
      },
      {
        title: "Gaming",
        items: ["Console", "Gaming Accessories", "VR Headset"]
      }
    ]
  },
  "Home Appliance": {
    subcategories: [
      {
        title: "Kitchen Appliances",
        items: ["Refrigerator", "Microwave", "Blender", "Coffee Maker", "Toaster"]
      },
      {
        title: "Laundry",
        items: ["Washing Machine", "Dryer", "Iron"]
      },
      {
        title: "Cleaning",
        items: ["Vacuum Cleaner", "Steam Cleaner", "Air Purifier"]
      }
    ]
  },
  "Photography": {
    subcategories: [
      {
        title: "Cameras",
        items: ["DSLR", "Mirrorless", "Action Camera", "Instant Camera"]
      },
      {
        title: "Lenses",
        items: ["Wide Angle", "Telephoto", "Macro", "Prime"]
      },
      {
        title: "Accessories",
        items: ["Tripod", "Camera Bag", "Memory Card", "Battery"]
      }
    ]
  },
  "Fashion, Make Up & Beauty Care": {
    subcategories: [
      {
        title: "Clothing",
        items: ["Men's Fashion", "Women's Fashion", "Kids' Fashion"]
      },
      {
        title: "Beauty",
        items: ["Makeup", "Skincare", "Hair Care", "Fragrance"]
      },
      {
        title: "Accessories",
        items: ["Jewelry", "Watches", "Bags", "Shoes"]
      }
    ]
  },
  "Toys, Kids & Baby": {
    subcategories: [
      {
        title: "Toys",
        items: ["Educational Toys", "Action Figures", "Dolls", "Building Blocks"]
      },
      {
        title: "Baby Care",
        items: ["Diapers", "Baby Food", "Baby Clothes", "Strollers"]
      },
      {
        title: "Kids Furniture",
        items: ["Cribs", "High Chairs", "Play Mats"]
      }
    ]
  },
  "Hobby": {
    subcategories: [
      {
        title: "Arts & Crafts",
        items: ["Painting", "Drawing", "Sculpting", "DIY Kits"]
      },
      {
        title: "Music",
        items: ["Instruments", "Sheet Music", "Audio Equipment"]
      },
      {
        title: "Sports",
        items: ["Fitness Equipment", "Outdoor Gear", "Team Sports"]
      }
    ]
  },
  "Sports": {
    subcategories: [
      {
        title: "Fitness",
        items: ["Gym Equipment", "Yoga Mats", "Weights", "Cardio Machines"]
      },
      {
        title: "Outdoor",
        items: ["Camping Gear", "Hiking Equipment", "Water Sports"]
      },
      {
        title: "Team Sports",
        items: ["Football", "Basketball", "Tennis", "Badminton"]
      }
    ]
  }
};

interface CategoryDropdownProps {
  className?: string;
}

export function CategoryDropdown({ className }: CategoryDropdownProps) {
  const [activeCategory, setActiveCategory] = useState<string>("Smartphone & Tablet");

  const categories = Object.keys(categoryData);
  const currentCategoryData = categoryData[activeCategory] || categoryData["Smartphone & Tablet"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className={cn(
          "flex items-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors",
          className
        )}
      >
        <span className="hidden sm:inline">Categories</span>
        <span className="sm:hidden">Cat</span>
        <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-[95vw] max-w-[1200px] p-0 shadow-xl border-0 md:w-[1200px]" 
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col md:flex-row bg-white rounded-lg overflow-hidden">
          {/* Category Tabs */}
          <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-1 md:space-y-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                      activeCategory === category
                        ? "bg-primary-500 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Content */}
          <div className="flex-1 p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {currentCategoryData?.subcategories?.map((subcategory, index) => (
                <div key={index} className="space-y-3">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {subcategory.title}
                  </h4>
                  <ul className="space-y-2">
                    {subcategory.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        <a
                          href="#"
                          className="text-sm text-gray-600 hover:text-primary-500 transition-colors"
                        >
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Main Products Row */}
            {currentCategoryData?.mainProducts && (
              <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-3 md:gap-6">
                  {currentCategoryData.mainProducts.map((product, index) => (
                    <a
                      key={index}
                      href="#"
                      className="text-sm font-medium text-gray-900 hover:text-primary-500 transition-colors"
                    >
                      {product}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
