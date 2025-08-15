/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import {Content, GoogleGenAI, Modality} from '@google/genai';
import {
  Download,
  ImageUp,
  KeyRound,
  LoaderCircle,
  SendHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

function parseError(error: string) {
  const regex = /{"error":(.*)}/gm;
  const m = regex.exec(error);
  try {
    const e = m[1];
    const err = JSON.parse(e);
    return err.message || error;
  } catch (e) {
    return error;
  }
}

export default function Home() {
  const canvasRef = useRef(null);
  const backgroundImageRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const colorInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Load API key from local storage on initial render
  useEffect(() => {
    const storedApiKey = localStorage.getItem('gemini-api-key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  // Load background image when generatedImage changes
  useEffect(() => {
    if (generatedImage && canvasRef.current) {
      // Use the window.Image constructor to avoid conflict with Next.js Image component
      const img = new window.Image();
      img.onload = () => {
        backgroundImageRef.current = img;
        drawImageToCanvas();
      };
      img.src = generatedImage;
    }
  }, [generatedImage]);

  // Initialize canvas with white background when component mounts
  useEffect(() => {
    if (canvasRef.current) {
      initializeCanvas();
    }
  }, []);

  // Initialize canvas with white background
  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Fill canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Draw the background image to the canvas, fitting and centering it
  const drawImageToCanvas = () => {
    if (!canvasRef.current || !backgroundImageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = backgroundImageRef.current;

    // Fill with white background first
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate aspect ratios to fit and center the image
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgRatio > canvasRatio) {
      // Image is wider than canvas
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgRatio;
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      // Image is taller than or same aspect as canvas
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgRatio;
      offsetY = 0;
      offsetX = (canvas.width - drawWidth) / 2;
    }

    // Draw the background image centered
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  // Get the correct coordinates based on canvas scaling
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calculate the scaling factor between the internal canvas size and displayed size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Apply the scaling to get accurate coordinates
    return {
      x:
        (e.nativeEvent.offsetX ||
          e.nativeEvent.touches?.[0]?.clientX - rect.left) * scaleX,
      y:
        (e.nativeEvent.offsetY ||
          e.nativeEvent.touches?.[0]?.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const {x, y} = getCoordinates(e);

    // Prevent default behavior to avoid scrolling on touch devices
    if (e.type === 'touchstart') {
      e.preventDefault();
    }

    // Start a new path without clearing the canvas
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    // Prevent default behavior to avoid scrolling on touch devices
    if (e.type === 'touchmove') {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const {x, y} = getCoordinates(e);

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Fill with white instead of just clearing
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setGeneratedImage(null);
    backgroundImageRef.current = null;
  };

  const handleColorChange = (e) => {
    setPenColor(e.target.value);
  };

  const openColorPicker = () => {
    if (colorInputRef.current) {
      colorInputRef.current.click();
    }
  };

  const openFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result;
      if (typeof imageUrl === 'string') {
        setGeneratedImage(imageUrl);
      }
    };
    reader.readAsDataURL(file);

    // Reset file input value to allow uploading the same file again
    if (e.target) {
      e.target.value = null;
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Create a temporary canvas to ensure a white background, similar to handleSubmit
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Fill with white background
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the current canvas content on top
    tempCtx.drawImage(canvas, 0, 0);

    // Get the data URL from the temporary canvas
    const dataUrl = tempCanvas.toDataURL('image/png');

    // Create a link and trigger the download
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'gemini-co-drawing.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      openColorPicker();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!apiKey) {
      setErrorMessage('Please enter your Gemini API key to proceed.');
      setShowApiKeyModal(true);
      return;
    }

    if (!canvasRef.current) return;

    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({apiKey});

      // Get the drawing as base64 data
      const canvas = canvasRef.current;

      // Create a temporary canvas to add white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');

      // Fill with white background
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Draw the original canvas content on top of the white background
      tempCtx.drawImage(canvas, 0, 0);

      const drawingData = tempCanvas.toDataURL('image/png').split(',')[1];

      let contents: Content[] = [
        {
          role: 'USER',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ];

      if (drawingData) {
        contents = [
          {
            role: 'USER',
            parts: [{inlineData: {data: drawingData, mimeType: 'image/png'}}],
          },
          {
            role: 'USER',
            parts: [
              {
                text: `${prompt}. Keep the same minimal line doodle style.`,
              },
            ],
          },
        ];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-preview-image-generation',
        contents,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const data = {
        success: true,
        message: '',
        imageData: null,
        error: undefined,
      };

      for (const part of response.candidates[0].content.parts) {
        // Based on the part type, either get the text or image data
        if (part.text) {
          data.message = part.text;
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          data.imageData = imageData;
        }
      }

      if (data.imageData) {
        const imageUrl = `data:image/png;base64,${data.imageData}`;
        setGeneratedImage(imageUrl);
      } else {
        throw new Error('Failed to generate image. No image data received.');
      }
    } catch (error) {
      console.error('Error submitting drawing:', error);
      const errorMessage =
        error.message || 'An unexpected error occurred.';
      // Check for API key specific error
      if (errorMessage.includes('API key not valid')) {
        setErrorMessage(
          'Your API key is invalid. Please check and enter it again.',
        );
        setApiKey('');
        localStorage.removeItem('gemini-api-key');
        setShowApiKeyModal(true);
      } else {
        setErrorMessage(parseError(errorMessage));
        setShowErrorModal(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Close the error modal
  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  // Handle the custom API key submission
  const handleApiKeySubmit = (e) => {
    e.preventDefault();
    const newApiKey = e.target.elements.apiKey.value;
    if (newApiKey) {
      setApiKey(newApiKey);
      localStorage.setItem('gemini-api-key', newApiKey);
      setShowApiKeyModal(false);
      setErrorMessage('');
    }
  };

  // Add touch event prevention function
  useEffect(() => {
    // Function to prevent default touch behavior on canvas
    const preventTouchDefault = (e) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };

    // Add event listener when component mounts
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', preventTouchDefault, {
        passive: false,
      });
      canvas.addEventListener('touchmove', preventTouchDefault, {
        passive: false,
      });
    }

    // Remove event listener when component unmounts
    return () => {
      if (canvas) {
        canvas.removeEventListener('touchstart', preventTouchDefault);
        canvas.removeEventListener('touchmove', preventTouchDefault);
      }
    };
  }, [isDrawing]);

  return (
    <>
      <div className="min-h-screen notebook-paper-bg text-gray-900 flex flex-col justify-start items-center">
        <main className="container mx-auto px-3 sm:px-6 py-5 sm:py-10 pb-32 max-w-5xl w-full">
          {/* Header section with title and tools */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2 sm:mb-6 gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-0 leading-tight font-mega">
                Gemini Co-Drawing
              </h1>
              <p className="text-sm sm:text-base text-gray-500 mt-1">
                Built with{' '}
                <a
                  className="underline"
                  href="https://ai.google.dev/gemini-api/docs/image-generation"
                  target="_blank"
                  rel="noopener noreferrer">
                  Gemini 2.0 native image generation
                </a>
              </p>
              <p className="text-sm sm:text-base text-gray-500 mt-1">
                by Swapnil Agrawal
              </p>
            </div>

            <menu className="flex items-center bg-gray-300 rounded-full p-2 shadow-sm self-start sm:self-auto gap-2">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm transition-all hover:bg-gray-50 hover:scale-110"
                aria-label="Set API Key">
                <KeyRound className="w-5 h-5 text-gray-700" />
              </button>
              <button
                type="button"
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-sm transition-transform hover:scale-110"
                onClick={openColorPicker}
                onKeyDown={handleKeyDown}
                aria-label="Open color picker"
                style={{backgroundColor: penColor}}>
                <input
                  ref={colorInputRef}
                  type="color"
                  value={penColor}
                  onChange={handleColorChange}
                  className="opacity-0 absolute w-px h-px"
                  aria-label="Select pen color"
                />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
                aria-label="Upload an image file"
              />
              <button
                type="button"
                onClick={openFileInput}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm transition-all hover:bg-gray-50 hover:scale-110"
                aria-label="Upload an image">
                <ImageUp className="w-5 h-5 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm transition-all hover:bg-gray-50 hover:scale-110">
                <Trash2
                  className="w-5 h-5 text-gray-700"
                  aria-label="Clear Canvas"
                />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm transition-all hover:bg-gray-50 hover:scale-110"
                aria-label="Download image">
                <Download className="w-5 h-5 text-gray-700" />
              </button>
            </menu>
          </div>

          {/* Canvas section with notebook paper background */}
          <div className="w-full mb-6">
            <canvas
              ref={canvasRef}
              width={960}
              height={540}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="border-2 border-black w-full  hover:cursor-crosshair sm:h-[60vh]
                h-[30vh] min-h-[320px] bg-white/90 touch-none"
            />
          </div>

          {/* Input form that matches canvas width */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Add your change..."
                className="w-full p-3 sm:p-4 pr-12 sm:pr-14 text-sm sm:text-base border-2 border-black bg-white text-gray-800 shadow-sm focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all font-mono"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-none bg-black text-white hover:cursor-pointer hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                {isLoading ? (
                  <LoaderCircle
                    className="w-5 sm:w-6 h-5 sm:h-6 animate-spin"
                    aria-label="Loading"
                  />
                ) : (
                  <SendHorizontal
                    className="w-5 sm:w-6 h-5 sm:h-6"
                    aria-label="Submit"
                  />
                )}
              </button>
            </div>
          </form>
        </main>
        {/* API Key Modal */}
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-700">
                  Enter Gemini API Key
                </h3>
                <button
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setErrorMessage('');
                  }}
                  className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                To use this app, please enter your Google Gemini API key. You
                can get one from{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline">
                  Google AI Studio
                </a>
                .
              </p>
              {errorMessage && (
                <p className="text-red-500 mb-4">{errorMessage}</p>
              )}
              <form onSubmit={handleApiKeySubmit}>
                <input
                  type="password"
                  name="apiKey"
                  defaultValue={apiKey}
                  placeholder="Your API Key"
                  className="w-full p-3 mb-4 border-2 border-black bg-white text-gray-800 shadow-sm focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all font-mono"
                  required
                />
                <button
                  type="submit"
                  className="w-full p-3 bg-black text-white hover:bg-gray-800 transition-colors">
                  Save and Continue
                </button>
              </form>
            </div>
          </div>
        )}
        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-700">
                  Failed to generate
                </h3>
                <button
                  onClick={closeErrorModal}
                  className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="font-medium text-gray-600">
                {parseError(errorMessage)}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
