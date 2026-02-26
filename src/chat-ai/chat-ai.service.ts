import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { PrismaService } from '../prisma/prisma.service'

export interface ProductoSimplificado {
  id: number
  nombre: string
  descripcion: string
  precio: number
  marca: string
  categoria: string
}

@Injectable()
export class ChatAiService {
  private anthropic: Anthropic

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY no está configurada en las variables de entorno')
    }
    this.anthropic = new Anthropic({ apiKey })
  }

  async chat(userMessage: string): Promise<{ response: string; productos?: ProductoSimplificado[] }> {
    try {
      // Obtener todos los productos activos de la base de datos
      const productos = await this.prisma.producto.findMany({
        where: { activo: true },
        include: {
          marca: true,
          categoria: true,
        },
      })

      // Simplificar la información de productos para el contexto
      const productosSimplificados: ProductoSimplificado[] = productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion || '',
        precio: p.precio.toNumber(),
        marca: p.marca.nombre,
        categoria: p.categoria.nombre,
      }))

      const systemPrompt = `Eres un asistente virtual de una farmacia. Tienes acceso al siguiente catálogo de productos:

${JSON.stringify(productosSimplificados, null, 2)}

Tu trabajo es:
1. Ayudar a los usuarios a encontrar medicamentos y productos de salud según sus síntomas o necesidades
2. Recomendar productos específicos de nuestro catálogo que puedan ayudarles
3. Ser amable, profesional y empático
4. Si recomendas productos, menciona su nombre exacto, marca y precio
5. Recuerda que NO puedes diagnosticar, solo recomendar productos de venta libre
6. Si el síntoma es grave, sugiere consultar con un médico

Importante: Al recomendar productos, DEBES incluir el ID del producto en tu respuesta en el siguiente formato:
[PRODUCTO:id:nombre]

Por ejemplo: "Te recomiendo [PRODUCTO:5:Paracetamol 500mg] para aliviar tu dolor de cabeza."`

      // Enviar mensaje a Claude
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })

      const text = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')

      // Extraer IDs de productos mencionados
      const productosRecomendados = this.extraerProductosRecomendados(text, productosSimplificados)

      return {
        response: text,
        productos: productosRecomendados,
      }
    } catch (error) {
      console.error('Error en chat AI:', error)
      throw new Error('Error al procesar el mensaje')
    }
  }

  private extraerProductosRecomendados(texto: string, productos: ProductoSimplificado[]): ProductoSimplificado[] {
    const productosRecomendados: ProductoSimplificado[] = []

    // Buscar el patrón [PRODUCTO:id:nombre]
    const regex = /\[PRODUCTO:(\d+):([^\]]+)\]/g
    let match

    while ((match = regex.exec(texto)) !== null) {
      const productoId = parseInt(match[1])
      const producto = productos.find((p) => p.id === productoId)

      if (producto && !productosRecomendados.find((p) => p.id === producto.id)) {
        productosRecomendados.push(producto)
      }
    }

    return productosRecomendados
  }
}
