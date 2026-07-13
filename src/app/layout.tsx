import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GradientMesh } from "@/components/GradientMesh";
import { WaterDrops } from "@/components/WaterDrops";
import { ToastProvider } from "@/components/ui/Toast";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartBD Unlock — GSM Service Platform",
  description: "Professional GSM mobile service reseller management platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers()
  const nonce = headerStore.get('X-Nonce') || undefined

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
          <ThemeProvider>
            <ToastProvider>
              {/* SVG Filters for Liquid Glass Effect */}
              <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
                <defs>
                  {/* Dynamic Water Ripple Filter */}
                  <filter id="water-ripple" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
                    <feTurbulence
                      id="dynamicTurbulence"
                      type="fractalNoise"
                      baseFrequency="0.015"
                      numOctaves="3"
                      seed="2"
                      result="noise"
                    />
                    <feDisplacementMap
                      id="dynamicDisplacement"
                      in="SourceGraphic"
                      in2="noise"
                      scale="0"
                      xChannelSelector="R"
                      yChannelSelector="G"
                      result="displaced"
                    >
                      <animate attributeName="scale" values="0;15;0" dur="0.8s" begin="indefinite" fill="freeze" />
                    </feDisplacementMap>
                    <feGaussianBlur
                      id="dynamicBlur"
                      in="displaced"
                      stdDeviation="0.5"
                    />
                  </filter>

                  {/* Premium Glass Filter with Specular Lighting */}
                  <filter id="premium-glass" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
                    <feTurbulence
                      id="premiumTurbulence"
                      type="fractalNoise"
                      baseFrequency="0.012"
                      numOctaves="3"
                      seed="5"
                      result="turbulence"
                    />
                    <feDisplacementMap
                      id="premiumDisplacement"
                      in="SourceGraphic"
                      in2="turbulence"
                      scale="0"
                      xChannelSelector="R"
                      yChannelSelector="G"
                      result="displaced"
                    />
                    <feGaussianBlur
                      id="premiumBlur"
                      in="displaced"
                      stdDeviation="0.5"
                      result="blurred"
                    />
                    <feSpecularLighting
                      id="premiumSpecular"
                      in="blurred"
                      surfaceScale="3"
                      specularConstant="1"
                      specularExponent="60"
                      lightingColor="#5ac8fa"
                      result="specular"
                    >
                      <fePointLight id="specularLight" x="200" y="200" z="250" />
                    </feSpecularLighting>
                    <feComposite
                      in="specular"
                      in2="SourceAlpha"
                      operator="in"
                      result="specClip"
                    />
                    <feComposite
                      in="blurred"
                      in2="specClip"
                      operator="arithmetic"
                      k1="0"
                      k2="1"
                      k3="0.35"
                      k4="0"
                    />
                  </filter>

                  {/* Mouse-following Distortion Filter */}
                  <filter id="mouse-distort" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
                    <feTurbulence
                      id="mouseTurbulence"
                      type="turbulence"
                      baseFrequency="0.02"
                      numOctaves="2"
                      seed="1"
                      result="turbulence"
                    />
                    <feDisplacementMap
                      in="SourceGraphic"
                      in2="turbulence"
                      scale="0"
                      xChannelSelector="R"
                      yChannelSelector="G"
                    />
                  </filter>
                </defs>
              </svg>

              <GradientMesh />
              <WaterDrops />
              {children}
            </ToastProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
