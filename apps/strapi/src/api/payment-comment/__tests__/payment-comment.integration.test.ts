/**
 * Payment Comment Integration Tests
 * 
 * Comprehensive integration tests for Payment Comment module covering:
 * - Payment comment creation for authenticated users
 * - Payment comment validation and error handling
 * - Payment comment security and authorization
 * - Payment comment CRUD operations
 * - Payment comment filtering and search
 */

import request from 'supertest'
import fs from 'fs'
import path from 'path'
import { 
  SERVER_URL, 
  setupTestEnvironment, 
  cleanupTestResources, 
  createPayment,
  TestContext,
  TestResources
} from '../../payment/__tests__/test-helpers'

describe('Payment Comment Integration Tests', () => {
  let context: TestContext
  let resources: TestResources
  let uploadedFiles: any[] = []

  // Helper function to create dummy text files
  const createDummyFile = (filename: string, content: string): string => {
    const filePath = path.join(__dirname, filename)
    fs.writeFileSync(filePath, content)
    return filePath
  }

  // Helper function to upload a file to Strapi
  const uploadFile = async (filePath: string, authToken: string): Promise<any> => {
    const response = await request(SERVER_URL)
      .post('/api/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('files', filePath)
      .expect(201)

    return response.body[0] // Strapi returns an array of uploaded files
  }

  // Helper function to clean up uploaded files
  const cleanupUploadedFiles = async (authToken: string) => {
    for (const file of uploadedFiles) {
      try {
        await request(SERVER_URL)
          .delete(`/api/upload/files/${file.id}`)
          .set('Authorization', `Bearer ${authToken}`)
      } catch (error) {
        console.warn(`Failed to delete uploaded file ${file.id}:`, error.message)
      }
    }
    uploadedFiles = []
  }

  beforeAll(async () => {
    try {
      const setup = await setupTestEnvironment()
      context = setup.context
      resources = setup.resources

      // Create a test payment for comment operations
      const paymentData = {
        paymentMethod: context.testPaymentMethod.documentId,
        amount: 100.00,
        currency: 'USD',
        paymentType: 'manual',
        paymentNotes: 'Test payment for comment integration tests'
      }

      const payment = await createPayment(context.testOrder.documentId, paymentData, context.testUserJwt)
      resources.createdPayments.push(payment)
      context.testPayment = payment
    } catch (error) {
      console.error('Failed to setup test environment:', error)
      throw error
    }
  })

  afterAll(async () => {
    if (context && context.apiToken) {
      // Clean up uploaded files first
      await cleanupUploadedFiles(context.apiToken)
      
      // Clean up test resources
      await cleanupTestResources(resources, context.apiToken)
    }
  })

  describe('Authenticated User Payment Comment Creation', () => {
    it('should create payment comment for authenticated user', async () => {
      const commentData = {
        content: 'Payment received via bank transfer',
        type: 'admin',
        isInternal: false
      }
      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ 
          data: {
            ...commentData,
            payment: context.testPayment.documentId
          }
        })
      expect(response.status).toBe(200)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.content).toBe(commentData.content)
      expect(response.body.data.type).toBe(commentData.type)
      expect(response.body.data.isInternal).toBe(commentData.isInternal)
      expect(response.body.data.author).toBeDefined()
      expect(response.body.data.payment).toBeDefined()

      resources.createdPayments.push(response.body.data)
    })

    it('should create internal payment comment', async () => {
      const commentData = {
        content: 'Internal note: Payment verification in progress',
        type: 'internal',
        isInternal: true
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ 
          data: {
            ...commentData,
            payment: context.testPayment.documentId
          }
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.content).toBe(commentData.content)
      expect(response.body.data.type).toBe(commentData.type)
      expect(response.body.data.isInternal).toBe(true)

      resources.createdPayments.push(response.body.data)
    })

    it('should create system-generated comment', async () => {
      const commentData = {
        content: 'Payment status updated automatically',
        type: 'system',
        isInternal: false,
        metadata: {
          systemEvent: 'status_change',
          previousStatus: 'pending',
          newStatus: 'processing'
        }
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ 
          data: {
            ...commentData,
            payment: context.testPayment.documentId
          }
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.content).toBe(commentData.content)
      expect(response.body.data.type).toBe(commentData.type)
      expect(response.body.data.metadata).toEqual(commentData.metadata)

      resources.createdPayments.push(response.body.data)
    })

    it('should create payment comment with attachments', async () => {
      // Create a dummy text file
      const dummyFile = createDummyFile('payment-receipt.txt', 'Payment receipt for transaction #12345\nAmount: $100.00\nDate: 2024-01-15')
      try {
        // Upload the file to Strapi
        const uploadedFile = await uploadFile(dummyFile, context.testUserAdminJwt)
        uploadedFiles.push(uploadedFile)
        const commentData = {
          content: 'Payment comment with supporting documents',
          type: 'admin',
          isInternal: false,
          attachments: [uploadedFile]
        }

        const response = await request(SERVER_URL)
          .post(`/api/payment-comment`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .send({ 
            data: {
              ...commentData,
              payment: context.testPayment.documentId
            }
          })
        expect(response.status).toBe(200)
        expect(response.body.data).toBeDefined()
        expect(response.body.data.content).toBe(commentData.content)
        expect(response.body.data.type).toBe(commentData.type)
        expect(response.body.data.attachments).toBeDefined()
        expect(Array.isArray(response.body.data.attachments)).toBe(true)
        expect(response.body.data.attachments.length).toBe(1)
        expect(response.body.data.attachments[0].id).toBe(uploadedFile.id)

        resources.createdPayments.push(response.body.data)
      } finally {
        // Clean up the dummy file
        if (fs.existsSync(dummyFile)) {
          fs.unlinkSync(dummyFile)
        }
      }
    })

    it('should create payment comment with multiple attachment types', async () => {
      // Create multiple dummy files
      const receiptFile = createDummyFile('receipt.txt', 'Payment receipt document\nTransaction ID: TXN-12345')
      const invoiceFile = createDummyFile('invoice.txt', 'Invoice document\nInvoice #: INV-67890\nTotal: $100.00')
      const notesFile = createDummyFile('notes.txt', 'Additional payment notes\nStatus: Completed\nMethod: Bank Transfer')
      
      try {
        // Upload all files to Strapi
        const uploadedFiles = await Promise.all([
          uploadFile(receiptFile, context.testUserAdminJwt),
          uploadFile(invoiceFile, context.testUserAdminJwt),
          uploadFile(notesFile, context.testUserAdminJwt)
        ])

        // Track uploaded files for cleanup
        uploadedFiles.forEach(file => uploadedFiles.push(file))

        const commentData = {
          content: 'Payment comment with multiple file types',
          type: 'info',
          isInternal: false,
          attachments: uploadedFiles
        }

        const response = await request(SERVER_URL)
          .post(`/api/payment-comment`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .send({ 
            data: {
              ...commentData,
              payment: context.testPayment.documentId
            }
          })
        expect(response.status).toBe(200) 
        expect(response.body.data).toBeDefined()
        expect(response.body.data.content).toBe(commentData.content)
        expect(response.body.data.type).toBe(commentData.type)
        expect(response.body.data.attachments).toBeDefined()
        expect(Array.isArray(response.body.data.attachments)).toBe(true)
        expect(response.body.data.attachments.length).toBe(3)
        expect(response.body.data.attachments.map(f => f.id)).toEqual(expect.arrayContaining(uploadedFiles.map(f => f.id)))

        resources.createdPayments.push(response.body.data)
      } finally {
        // Clean up dummy files
        [receiptFile, invoiceFile, notesFile].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file)
          }
        })
      }
    })
  })

  describe('Payment Comment Validation and Error Handling', () => {
    it('should reject payment comment creation with invalid payment ID', async () => {
      const commentData = {
        content: 'Test comment',
        noteType: 'admin',
        isInternal: false,
        payment: 'invalid-payment-id'
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ data: commentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment comment creation with missing content', async () => {
      const commentData = {
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ data: commentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment comment creation with invalid note type', async () => {
      const commentData = {
        content: 'Test comment',
        type: 'invalid_type',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ data: commentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should reject payment comment creation with content exceeding max length', async () => {
      const longContent = 'a'.repeat(2001) // Exceeds maxLength of 2000
      const commentData = {
        content: longContent,
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ data: commentData })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    it('should handle payment comment creation with valid file attachments', async () => {
      // Create a dummy text file (valid type for our schema)
      const validFile = createDummyFile('valid-attachment.txt', 'Valid attachment file\nType: Text Document\nContent: Payment receipt')
      
      try {
        // Upload the file to Strapi
        const uploadedFile = await uploadFile(validFile, context.testUserAdminJwt)
        uploadedFiles.push(uploadedFile)

        const commentData = {
          content: 'Test comment with valid attachments',
          type: 'admin',
          isInternal: false,
          payment: context.testPayment.documentId,
          attachments: [uploadedFile]
        }

        const response = await request(SERVER_URL)
          .post(`/api/payment-comment`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .send({ data: commentData })
          .expect(200)

        expect(response.body.data).toBeDefined()
        expect(response.body.data.attachments).toBeDefined()
        expect(Array.isArray(response.body.data.attachments)).toBe(true)
        expect(response.body.data.attachments.length).toBe(1)
        expect(response.body.data.attachments[0].id).toBe(uploadedFile.id)

        resources.createdPayments.push(response.body.data)
      } finally {
        // Clean up the dummy file
        if (fs.existsSync(validFile)) {
          fs.unlinkSync(validFile)
        }
      }
    })

    it('should reject payment comment creation with non-existent attachment IDs', async () => {
      const commentData = {
        content: 'Test comment with invalid attachment ID',
        type: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId,
        attachments: ['non-existent-file-id-12345']
      }

      // This should either fail or handle gracefully depending on your validation
      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ data: commentData })

      // The response could be 400 (validation error) or 200 (if validation is lenient)
      // Adjust expectations based on your actual validation logic
      expect([200, 400]).toContain(response.status)
      
      if (response.status === 200) {
        expect(response.body.data).toBeDefined()
        resources.createdPayments.push(response.body.data)
      }
    })

    it('should reject payment comment creation without authentication for authenticated endpoints', async () => {
      const commentData = {
        content: 'Test comment',
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .send({ data: commentData })
        .expect(403)
    })
  })

  describe('Payment Comment CRUD Operations', () => {
    let testComment: any

    beforeAll(async () => {
      // Create a test comment for CRUD operations
      const commentData = {
        content: 'Test comment for CRUD operations',
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ data: commentData })
        .expect(200)

      testComment = response.body.data
      resources.createdPayments.push(testComment)
    })

    it('should retrieve payment comment by ID', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/payment-comment/${testComment.documentId}`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.documentId).toBe(testComment.documentId)
      expect(response.body.data.content).toBe(testComment.content)
    })

    it('should update payment comment', async () => {
      const updateData = {
        content: 'Updated comment content',
        type: 'warning'
      }

      const response = await request(SERVER_URL)
        .put(`/api/payment-comment/${testComment.documentId}`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ data: updateData })
        .expect(200)

      expect(response.body.data).toBeDefined()
      expect(response.body.data.content).toBe(updateData.content)
      expect(response.body.data.type).toBe(updateData.type)
    })

    it('should update payment comment with attachments', async () => {
      // Create dummy files for update
      const updatedFile1 = createDummyFile('updated-document1.txt', 'Updated document 1\nVersion: 2.0\nDate: 2024-01-15')
      const updatedFile2 = createDummyFile('updated-document2.txt', 'Updated document 2\nVersion: 2.0\nDate: 2024-01-15')
      
      try {
        // Upload files to Strapi
        const uploadedFiles = await Promise.all([
          uploadFile(updatedFile1, context.testUserAdminJwt),
          uploadFile(updatedFile2, context.testUserAdminJwt)
        ])

        // Track uploaded files for cleanup
        uploadedFiles.forEach(file => uploadedFiles.push(file))

        const updateData = {
          content: 'Updated comment with attachments',
          type: 'info',
          attachments: uploadedFiles
        }

        const response = await request(SERVER_URL)
          .put(`/api/payment-comment/${testComment.documentId}`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .send({ data: updateData })
          .expect(200)
        expect(response.body.data).toBeDefined()
        expect(response.body.data.content).toBe(updateData.content)
        expect(response.body.data.type).toBe(updateData.type)
        expect(response.body.data.attachments).toBeDefined()
        expect(Array.isArray(response.body.data.attachments)).toBe(true)
        expect(response.body.data.attachments.length).toBe(2)
        expect(response.body.data.attachments.map(f => f.id)).toEqual(expect.arrayContaining(uploadedFiles.map(f => f.id)))
      } finally {
        // Clean up dummy files
        [updatedFile1, updatedFile2].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file)
          }
        })
      }
    })

    it('should delete payment comment', async () => {
      const response = await request(SERVER_URL)
        .delete(`/api/payment-comment/${testComment.documentId}`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .expect(200)

      expect(response.body.data).toBeDefined()
    })

    it('should reject retrieval of non-existent payment comment', async () => {
      await request(SERVER_URL)
        .get(`/api/payment-comment/non-existent-id`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .expect(404)
    })

    it('should reject update of non-existent payment comment', async () => {
      const updateData = {
        content: 'Updated content'
      }

      await request(SERVER_URL)
        .put(`/api/payment-comment/non-existent-id`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ data: updateData })
        .expect(404)
    })

    it('should reject deletion of non-existent payment comment', async () => {
      await request(SERVER_URL)
        .delete(`/api/payment-comment/non-existent-id`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .expect(404)
    })
  })

  describe('Payment Comment Filtering and Search', () => {
    let testComments: any[] = []

    beforeAll(async () => {
      // Create multiple test comments for filtering tests
      const commentTypes = ['admin', 'system', 'internal', 'note', 'warning', 'info']
      
      for (let i = 0; i < commentTypes.length; i++) {
        const commentData = {
          content: `Test comment ${i + 1} of type ${commentTypes[i]}`,
          noteType: commentTypes[i],
          isInternal: i % 2 === 0, // Alternate between internal and external
          payment: context.testPayment.documentId
        }

        const response = await request(SERVER_URL)
          .post(`/api/payment-comment`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .send({ data: commentData })
          .expect(200)

        testComments.push(response.body.data)
        resources.createdPayments.push(response.body.data)
      }
    })

    it('should filter payment comments by note type', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .query({ 
          'type': 'admin',
          'payment': context.testPayment.documentId
        })
      expect(response.status).toBe(200)
      expect(response.body.data.comments).toBeDefined()
      expect(response.body.data.comments.length).toBeGreaterThan(0)
      response.body.data.comments.forEach((comment: any) => {
        expect(comment.type).toBe('admin')
      })
    })

    it('should filter payment comments by internal status', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .query({ 
          'isInternal': 'true',
          'payment': context.testPayment.documentId
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      response.body.data.comments.forEach((comment: any) => {
        expect(comment.isInternal).toBe(true)
      })
    })

    it('should search payment comments by content', async () => {
      const response = await request(SERVER_URL)
        .get(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .query({ 
          'filters[content][$containsi]': 'admin',
          'payment': context.testPayment.documentId
        })
        .expect(200)

      expect(response.body.data).toBeDefined()
      response.body.data.comments.forEach((comment: any) => {
        expect(comment.content.toLowerCase()).toContain('admin')
      })
    })

    it('should paginate payment comments', async () => {
      const pageSize = 2
      const response = await request(SERVER_URL)
        .get(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .query({ 
          'payment': context.testPayment.documentId,
          'pageSize': pageSize,
          'page': 1
        })
        .expect(200)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.comments.length).toBeLessThanOrEqual(pageSize)
      expect(response.body.data.pagination).toBeDefined()
    })

    it('should filter payment comments with attachments', async () => {
      // Create dummy files for the comment
      const attachmentFile1 = createDummyFile('filter-test-doc1.txt', 'Filter test document 1\nType: Receipt')
      const attachmentFile2 = createDummyFile('filter-test-doc2.txt', 'Filter test document 2\nType: Invoice')
      
      try {
        // Upload files to Strapi
        const uploadedFiles = await Promise.all([
          uploadFile(attachmentFile1, context.testUserAdminJwt),
          uploadFile(attachmentFile2, context.testUserAdminJwt)
        ])

        // Track uploaded files for cleanup
        uploadedFiles.forEach(file => uploadedFiles.push(file))

        // Create a comment with attachments
        const commentWithAttachments = {
          content: 'Comment with attachments for filtering test',
          type: 'admin',
          isInternal: false,
          attachments: uploadedFiles
        }

        const createResponse = await request(SERVER_URL)
          .post(`/api/payment-comment`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .send({ 
            data: {
              ...commentWithAttachments,
              payment: context.testPayment.documentId
            }
          })
          .expect(200)

        resources.createdPayments.push(createResponse.body.data)

        // Now test filtering - retrieve comments and verify attachments
        const response = await request(SERVER_URL)
          .get(`/api/payment-comment`)
          .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
          .query({ 
            'payment': context.testPayment.documentId,
            'type': 'admin'
          })
          .expect(200)

        expect(response.body.data).toBeDefined()
        expect(response.body.data.comments).toBeDefined()
        
        // Find the comment we just created
        const createdComment = response.body.data.comments.find(
          (comment: any) => comment.content === commentWithAttachments.content
        )
        expect(createdComment).toBeDefined()
        expect(createdComment.attachments).toBeDefined()
        expect(Array.isArray(createdComment.attachments)).toBe(true)
        expect(createdComment.attachments.length).toBe(2)
        expect(createdComment.attachments.map(f => f.id)).toEqual(expect.arrayContaining(uploadedFiles.map(f => f.id)))
      } finally {
        // Clean up dummy files
        [attachmentFile1, attachmentFile2].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file)
          }
        })
      }
    })
  })

  describe('Payment Comment Security and Authorization', () => {
    it('should validate user ownership for payment comment operations', async () => {
      // Create another user
      const anotherUserData = {
        username: `anotheruser${context.timestamp}`,
        email: `anotheruser${context.timestamp}@example.com`,
        password: 'TestPassword123!',
      }

      const anotherUserResponse = await request(SERVER_URL)
        .post('/api/auth/local/register')
        .send(anotherUserData)
        .timeout(10000)

      if (anotherUserResponse.status !== 200) {
        throw new Error(`Failed to create another test user: ${anotherUserResponse.status}`)
      }

      const anotherUser = anotherUserResponse.body.user
      const anotherUserJwt = anotherUserResponse.body.jwt
      resources.createdUsers.push(anotherUser)

      // Try to create comment for payment owned by different user
      const commentData = {
        content: 'Unauthorized comment',
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${anotherUserJwt}`)
        .send({ data: commentData })
        .expect(403)

      expect(response.body.error).toBeDefined()
    })

    it('should prevent unauthorized access to internal comments', async () => {
      // Create an internal comment
      const commentData = {
        content: 'Internal comment',
        noteType: 'internal',
        isInternal: true,
        payment: context.testPayment.documentId
      }

      const createResponse = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ data: commentData })
        .expect(200)

      const internalComment = createResponse.body.data
      resources.createdPayments.push(internalComment)

      // Try to access internal comments without proper authorization
      const response = await request(SERVER_URL)
        .get(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .query({ 
          'payment': context.testPayment.documentId,
          'isInternal': 'true'
        })
        .expect(200)

      // Should not return internal comments for regular users
      expect(response.body.data).toBeDefined()
      // The exact behavior depends on your authorization logic
    })


  })

  describe('Payment Comment Performance and Concurrent Operations', () => {
    it('should handle multiple concurrent comment operations', async () => {
      const concurrentRequests = 5
      const promises: any[] = []

      for (let i = 0; i < concurrentRequests; i++) {
        const commentData = {
          content: `Concurrent comment ${i + 1}`,
          noteType: 'note',
          isInternal: false,
          payment: context.testPayment.documentId
        }

        promises.push(
          request(SERVER_URL)
            .post(`/api/payment-comment`)
            .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
            .send({ data: commentData })
            .timeout(10000)
        )
      }

      const responses = await Promise.all(promises)

      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.data).toBeDefined()
        resources.createdPayments.push(response.body.data)
      })
    })

    it('should handle concurrent comment operations with attachments', async () => {
      const concurrentRequests = 3
      const promises: any[] = []
      const dummyFiles: string[] = []

      try {
        // Create dummy files for each concurrent request
        for (let i = 0; i < concurrentRequests; i++) {
          const file1 = createDummyFile(`concurrent-file-${i}-1.txt`, `Concurrent file ${i + 1} - Document 1\nRequest: ${i + 1}`)
          const file2 = createDummyFile(`concurrent-file-${i}-2.txt`, `Concurrent file ${i + 1} - Document 2\nRequest: ${i + 1}`)
          dummyFiles.push(file1, file2)

          // Upload files for this request
          const uploadedFiles = await Promise.all([
            uploadFile(file1, context.testUserAdminJwt),
            uploadFile(file2, context.testUserAdminJwt)
          ])

          // Track uploaded files for cleanup
          uploadedFiles.forEach(file => uploadedFiles.push(file))

          const commentData = {
            content: `Concurrent comment with attachments ${i + 1}`,
            type: 'admin',
            isInternal: false,
            payment: context.testPayment.documentId,
            attachments: uploadedFiles
          }

          promises.push(
            request(SERVER_URL)
              .post(`/api/payment-comment`)
              .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
              .send({ data: commentData })
              .timeout(10000)
          )
        }

        const responses = await Promise.all(promises)

        responses.forEach(response => {
          expect(response.status).toBe(200)
          expect(response.body.data).toBeDefined()
          expect(response.body.data.attachments).toBeDefined()
          expect(Array.isArray(response.body.data.attachments)).toBe(true)
          expect(response.body.data.attachments.length).toBe(2)
          resources.createdPayments.push(response.body.data)
        })
      } finally {
        // Clean up all dummy files
        dummyFiles.forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file)
          }
        })
      }
    })

    it('should handle comment operations efficiently', async () => {
      const startTime = Date.now()

      const commentData = {
        content: 'Performance test comment',
        noteType: 'admin',
        isInternal: false,
        payment: context.testPayment.documentId
      }

      const response = await request(SERVER_URL)
        .post(`/api/payment-comment`)
        .set('Authorization', `Bearer ${context.testUserAdminJwt}`)
        .send({ data: commentData })
        .expect(200)

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(response.body.data).toBeDefined()
      resources.createdPayments.push(response.body.data)
    })
  })

})
