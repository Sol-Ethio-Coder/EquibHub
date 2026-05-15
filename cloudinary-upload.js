// cloudinary-upload.js - FREE image upload to Cloudinary

// ============================================
// 🔴 REPLACE WITH YOUR CLOUDINARY CLOUD NAME:
// Get it from https://cloudinary.com
// ============================================
const CLOUDINARY_CONFIG = {
    cloudName: "dkmx6c2qa",  // From cloudinary.com dashboard
    uploadPreset: "equibhub_preset"
};

async function uploadToCloudinary(file) {
    return new Promise(async (resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
                { method: 'POST', body: formData }
            );
            
            const data = await response.json();
            
            if (data.secure_url) {
                console.log('✅ Screenshot uploaded to Cloudinary');
                resolve(data.secure_url);
            } else {
                reject(new Error('Upload failed: ' + (data.error?.message || 'Unknown error')));
            }
        } catch (error) {
            console.error('Upload error:', error);
            reject(error);
        }
    });
}

// Compress image before upload
async function compressAndUpload(file, maxWidth = 1024) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(async (blob) => {
                    const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
                    try {
                        const url = await uploadToCloudinary(compressedFile);
                        resolve(url);
                    } catch (err) {
                        reject(err);
                    }
                }, 'image/jpeg', 0.8);
            };
            img.src = e.target.result;
        };
        reader.onerror = reject;
    });
}