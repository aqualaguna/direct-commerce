/**
 * Payment Notes Tests
 * 
 * Tests for payment notes and comments functionality
 */

describe('Payment Notes System', () => {
  let mockStrapi: any
  let paymentNotesService: any

  beforeEach(() => {
    // Mock Strapi instance
    mockStrapi = {
      documents: jest.fn((contentType) => ({
        findOne: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        publish: jest.fn(),
        unpublish: jest.fn(),
        discardDraft: jest.fn(),
      })),
      log: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      },
    }

    // Import and initialize the service
    const serviceModule = require('../services/payment-notes')
    paymentNotesService = serviceModule.default({ strapi: mockStrapi })

    // Clear all mocks before each test
    jest.clearAllMocks()

    // Set up default mock return values for documents
    mockStrapi.documents.mockReturnValue({
      findOne: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
      discardDraft: jest.fn(),
    } as any);
  })

  describe('Payment Notes Service', () => {
    describe('createPaymentNote', () => {
      it('should create a payment note successfully', async () => {
        // Arrange
        const mockManualPayment = {
          documentId: 'payment-123',
          amount: 5000,
          status: 'pending'
        }

        const mockPaymentNote = {
          documentId: 'note-123',
          manualPayment: mockManualPayment,
          author: { id: 1, username: 'admin' },
          noteType: 'admin',
          content: 'Payment received via bank transfer',
          isInternal: false,
          createdAt: new Date()
        }

        mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(mockManualPayment)
        mockStrapi.documents('api::payment-comment.payment-comment').create.mockResolvedValue(mockPaymentNote)



        const noteData = {
          manualPaymentId: 'payment-123',
          authorId: '1',
          noteType: 'admin' as const,
          content: 'Payment received via bank transfer',
          isInternal: false
        }

        // Act
        const result = await paymentNotesService.createPaymentNote(noteData)



        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockPaymentNote)
        expect(mockStrapi.documents('api::manual-payment.manual-payment').findOne).toHaveBeenCalledWith({
          documentId: 'payment-123'
        })
        expect(mockStrapi.documents('api::payment-comment.payment-comment').create).toHaveBeenCalledWith({
          data: {
            manualPayment: 'payment-123',
            author: '1',
            noteType: 'admin',
            content: 'Payment received via bank transfer',
            isInternal: false,
            metadata: {}
          },
          populate: ['manualPayment', 'author']
        })
      })

      it('should return error when manual payment not found', async () => {
        // Arrange
        mockStrapi.documents('api::manual-payment.manual-payment').findOne.mockResolvedValue(null)

        const noteData = {
          manualPaymentId: 'non-existent',
          authorId: '1',
          noteType: 'admin' as const,
          content: 'Test note'
        }

        // Act
        const result = await paymentNotesService.createPaymentNote(noteData)

        // Assert
        expect(result.success).toBe(false)
        expect(result.error).toBe('Manual payment not found')
      })

      it('should return error when required fields are missing', async () => {
        // Arrange
        const noteData = {
          manualPaymentId: 'payment-123',
          // Missing authorId and content
          noteType: 'admin' as const
        }

        // Act
        const result = await paymentNotesService.createPaymentNote(noteData)

        // Assert
        expect(result.success).toBe(false)
        expect(result.error).toBe('Manual payment ID, author ID, and content are required')
      })
    })

    describe('getPaymentNotes', () => {
      it('should get payment notes with filters', async () => {
        // Arrange
        const mockNotes = [
          {
            documentId: 'note-1',
            content: 'Admin note',
            noteType: 'admin',
            author: { username: 'admin' }
          },
          {
            documentId: 'note-2',
            content: 'Customer note',
            noteType: 'customer',
            author: { username: 'customer' }
          }
        ]

        mockStrapi.documents('api::payment-comment.payment-comment').findMany.mockResolvedValue(mockNotes)

        const filters = {
          manualPaymentId: 'payment-123',
          noteType: 'admin',
          page: 1,
          pageSize: 25
        }

        // Act
        const result = await paymentNotesService.getPaymentNotes(filters)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data.notes).toEqual(mockNotes)
        expect(result.data.pagination.page).toBe(1)
        expect(result.data.pagination.pageSize).toBe(25)
        expect(mockStrapi.documents('api::payment-comment.payment-comment').findMany).toHaveBeenCalledWith({
          filters: {
            manualPayment: 'payment-123',
            noteType: 'admin'
          },
          sort: 'createdAt:desc',
          limit: 25,
          start: 0,
          populate: ['manualPayment', 'author']
        })
      })

      it('should apply search filter', async () => {
        // Arrange
        const mockNotes = [
          {
            documentId: 'note-1',
            content: 'Payment received',
            author: { username: 'admin' }
          },
          {
            documentId: 'note-2',
            content: 'Different note',
            author: { username: 'customer' }
          }
        ]

        mockStrapi.documents('api::payment-comment.payment-comment').findMany.mockResolvedValue(mockNotes)

        const filters = {
          search: 'payment'
        }

        // Act
        const result = await paymentNotesService.getPaymentNotes(filters)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data.notes).toHaveLength(1)
        expect(result.data.notes[0].content).toBe('Payment received')
      })
    })

    describe('getPaymentNote', () => {
      it('should get payment note by ID', async () => {
        // Arrange
        const mockNote = {
          documentId: 'note-123',
          content: 'Test note',
          noteType: 'admin',
          author: { username: 'admin' }
        }

        mockStrapi.documents('api::payment-comment.payment-comment').findOne.mockResolvedValue(mockNote)

        // Act
        const result = await paymentNotesService.getPaymentNote('note-123')

        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockNote)
        expect(mockStrapi.documents('api::payment-comment.payment-comment').findOne).toHaveBeenCalledWith({
          documentId: 'note-123',
          populate: ['manualPayment', 'author']
        })
      })

      it('should return error when note not found', async () => {
        // Arrange
        mockStrapi.documents('api::payment-comment.payment-comment').findOne.mockResolvedValue(null)

        // Act
        const result = await paymentNotesService.getPaymentNote('non-existent')

        // Assert
        expect(result.success).toBe(false)
        expect(result.error).toBe('Payment note not found')
      })
    })

    describe('updatePaymentNote', () => {
      it('should update payment note successfully', async () => {
        // Arrange
        const existingNote = {
          documentId: 'note-123',
          content: 'Original content',
          noteType: 'admin'
        }

        const updatedNote = {
          ...existingNote,
          content: 'Updated content'
        }

        mockStrapi.documents('api::payment-comment.payment-comment').findOne.mockResolvedValue(existingNote)
        mockStrapi.documents('api::payment-comment.payment-comment').update.mockResolvedValue(updatedNote)

        const updateData = {
          content: 'Updated content'
        }

        // Act
        const result = await paymentNotesService.updatePaymentNote('note-123', updateData)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toEqual(updatedNote)
        expect(mockStrapi.documents('api::payment-comment.payment-comment').update).toHaveBeenCalledWith({
          documentId: 'note-123',
          data: { content: 'Updated content' },
          populate: ['manualPayment', 'author']
        })
      })

      it('should return error when note not found for update', async () => {
        // Arrange
        mockStrapi.documents('api::payment-comment.payment-comment').findOne.mockResolvedValue(null)

        // Act
        const result = await paymentNotesService.updatePaymentNote('non-existent', { content: 'test' })

        // Assert
        expect(result.success).toBe(false)
        expect(result.error).toBe('Payment note not found')
      })
    })

    describe('deletePaymentNote', () => {
      it('should delete payment note successfully', async () => {
        // Arrange
        const existingNote = {
          documentId: 'note-123',
          content: 'Test note'
        }

        mockStrapi.documents('api::payment-comment.payment-comment').findOne.mockResolvedValue(existingNote)
        mockStrapi.documents('api::payment-comment.payment-comment').delete.mockResolvedValue({})

        // Act
        const result = await paymentNotesService.deletePaymentNote('note-123')

        // Assert
        expect(result.success).toBe(true)
        expect(result.data.message).toBe('Payment note deleted successfully')
        expect(mockStrapi.documents('api::payment-comment.payment-comment').delete).toHaveBeenCalledWith({
          documentId: 'note-123'
        })
      })

      it('should return error when note not found for deletion', async () => {
        // Arrange
        mockStrapi.documents('api::payment-comment.payment-comment').findOne.mockResolvedValue(null)

        // Act
        const result = await paymentNotesService.deletePaymentNote('non-existent')

        // Assert
        expect(result.success).toBe(false)
        expect(result.error).toBe('Payment note not found')
      })
    })

    describe('getNotesByPayment', () => {
      it('should get notes for specific payment', async () => {
        // Arrange
        const mockNotes = [
          {
            documentId: 'note-1',
            content: 'Admin note',
            noteType: 'admin',
            author: { username: 'admin' }
          }
        ]

        mockStrapi.documents('api::payment-comment.payment-comment').findMany.mockResolvedValue(mockNotes)

        // Act
        const result = await paymentNotesService.getNotesByPayment('payment-123', false)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockNotes)
        expect(mockStrapi.documents('api::payment-comment.payment-comment').findMany).toHaveBeenCalledWith({
          filters: {
            manualPayment: 'payment-123',
            isInternal: false
          },
          sort: 'createdAt:desc',
          populate: ['author']
        })
      })

      it('should include internal notes when requested', async () => {
        // Arrange
        const mockNotes = [
          {
            documentId: 'note-1',
            content: 'Internal note',
            noteType: 'admin',
            isInternal: true,
            author: { username: 'admin' }
          }
        ]

        mockStrapi.documents('api::payment-comment.payment-comment').findMany.mockResolvedValue(mockNotes)

        // Act
        const result = await paymentNotesService.getNotesByPayment('payment-123', true)

        // Assert
        expect(result.success).toBe(true)
        expect(mockStrapi.documents('api::payment-comment.payment-comment').findMany).toHaveBeenCalledWith({
          filters: {
            manualPayment: 'payment-123'
          },
          sort: 'createdAt:desc',
          populate: ['author']
        })
      })
    })

    describe('searchPaymentNotes', () => {
      it('should search payment notes', async () => {
        // Arrange
        const mockNotes = [
          {
            documentId: 'note-1',
            content: 'Payment received',
            author: { username: 'admin' },
            noteType: 'admin'
          }
        ]

        // Mock the getPaymentNotes method
        paymentNotesService.getPaymentNotes = jest.fn().mockResolvedValue({
          success: true,
          data: { notes: mockNotes }
        })

        // Act
        const result = await paymentNotesService.searchPaymentNotes('payment')

        // Assert
        expect(result.success).toBe(true)
        expect(result.data.notes).toHaveLength(1)
        expect(result.data.searchTerm).toBe('payment')
      })
    })

    describe('getNoteStatistics', () => {
      it('should get note statistics', async () => {
        // Arrange
        const mockNotes = [
          {
            noteType: 'admin',
            isInternal: true,
            createdAt: new Date().toISOString()
          },
          {
            noteType: 'customer',
            isInternal: false,
            createdAt: new Date().toISOString()
          }
        ]

        mockStrapi.documents('api::payment-comment.payment-comment').findMany.mockResolvedValue(mockNotes)

        // Act
        const result = await paymentNotesService.getNoteStatistics()

        // Assert
        expect(result.success).toBe(true)
        expect(result.data.total).toBe(2)
        expect(result.data.byType.admin).toBe(1)
        expect(result.data.byType.customer).toBe(1)
        expect(result.data.internal).toBe(1)
        expect(result.data.external).toBe(1)
      })

      it('should get statistics for specific payment', async () => {
        // Arrange
        const mockNotes = [
          {
            noteType: 'admin',
            isInternal: false,
            createdAt: new Date().toISOString()
          }
        ]

        mockStrapi.documents('api::payment-comment.payment-comment').findMany.mockResolvedValue(mockNotes)

        // Act
        const result = await paymentNotesService.getNoteStatistics('payment-123')

        // Assert
        expect(result.success).toBe(true)
        expect(result.data.total).toBe(1)
        expect(mockStrapi.documents('api::payment-comment.payment-comment').findMany).toHaveBeenCalledWith({
          filters: { manualPayment: 'payment-123' },
          fields: ['noteType', 'isInternal', 'createdAt']
        })
      })
    })

    describe('sendNoteNotification', () => {
      it('should log notification for non-internal notes', async () => {
        // Arrange
        const mockNote = {
          documentId: 'note-123',
          manualPayment: { documentId: 'payment-123' },
          author: { username: 'admin' },
          noteType: 'admin',
          isInternal: false
        }

        // Act
        await paymentNotesService.sendNoteNotification(mockNote)

        // Assert
        expect(mockStrapi.log.info).toHaveBeenCalledWith('Payment note notification:', {
          noteId: 'note-123',
          paymentId: 'payment-123',
          author: 'admin',
          noteType: 'admin',
          isInternal: false
        })
      })
    })

    describe('createAuditLog', () => {
      it('should create audit log entry', async () => {
        // Arrange
        const action = 'create'
        const noteId = 'note-123'
        const userId = '1'
        const details = { noteType: 'admin' }

        // Act
        await paymentNotesService.createAuditLog(action, noteId, userId, details)

        // Assert
        expect(mockStrapi.log.info).toHaveBeenCalledWith('Payment note audit log:', {
          action: 'create',
          noteId: 'note-123',
          userId: '1',
          timestamp: expect.any(String),
          details: { noteType: 'admin' }
        })
      })
    })
  })
})
