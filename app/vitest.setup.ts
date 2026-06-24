import '@testing-library/jest-dom';
// IndexedDB מדומה לבדיקות (שכבת Data / cache הניקוד).
import 'fake-indexeddb/auto';

// jsdom אינו מממש Blob.text() — polyfill דרך FileReader
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function (): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
