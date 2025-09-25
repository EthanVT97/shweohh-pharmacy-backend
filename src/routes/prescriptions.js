import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads'); // Go up two levels to the root 'uploads' directory
    // In a production environment, ensure this directory exists or use cloud storage directly
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880') }, // default to 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${allowedTypes.join(', ')} are allowed!`), false);
    }
  }
});

const prescriptionRoutes = (supabase) => {
  const router = express.Router();

  // Get all prescriptions
  router.get('/', async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          customers (name, phone)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.range(
        (page - 1) * limit, 
        page * limit - 1
      );

      if (error) throw error;

      res.json({
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get single prescription
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          customers (name, phone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Prescription not found'
        });
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Upload new prescription
  // In a production environment, you would upload to Supabase Storage and save the public URL.
  // This example saves locally and provides a conceptual comment for Supabase Storage.
  router.post('/', upload.single('prescription_image'), async (req, res) => {
    try {
      const { customer_id, notes } = req.body;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No prescription image uploaded'
        });
      }

      // --- Supabase Storage Integration (Conceptual) ---
      // const fileBuffer = req.file.buffer; // If using memoryStorage
      // const fileExtension = path.extname(req.file.originalname);
      // const fileName = `prescriptions/${Date.now()}${fileExtension}`;
      // const { data: uploadData, error: uploadError } = await supabase.storage
      //   .from('your-supabase-bucket-name') // Replace with your actual bucket name
      //   .upload(fileName, fileBuffer, {
      //     contentType: req.file.mimetype,
      //     upsert: false // Set to true to overwrite if file with same name exists
      //   });

      // if (uploadError) throw uploadError;
      // const { data: publicUrlData } = supabase.storage
      //   .from('your-supabase-bucket-name')
      //   .getPublicUrl(uploadData.path);
      // const image_url = publicUrlData.publicUrl;
      // --- End Supabase Storage Integration ---

      // For local development: Use the local file path. Ensure `/uploads` is statically served.
      const image_url = `/uploads/${req.file.filename}`; 

      const { data, error } = await supabase
        .from('prescriptions')
        .insert({
          customer_id,
          image_url,
          notes,
          status: 'pending',
          created_at: new Date()
        })
        .select();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: data[0],
        message: "Prescription uploaded successfully",
        image_url: image_url // Return the URL for verification
      });
    } catch (error) {
      console.error('Prescription upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Update prescription status
  router.patch('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      const validStatuses = ['pending', 'reviewed', 'rejected', 'fulfilled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      const { data, error } = await supabase
        .from('prescriptions')
        .update({
          status,
          notes,
          updated_at: new Date()
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      res.json({
        success: true,
        data: data[0],
        message: `Prescription status updated to ${status}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Delete prescription (soft delete or hard delete based on policy)
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Consider if you also need to delete the file from storage (e.g., Supabase Storage)
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Prescription deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

export default prescriptionRoutes;
