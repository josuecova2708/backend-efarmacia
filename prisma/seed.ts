import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // 1) Create all permissions
    const permissionKeys = [
        'users.read',
        'users.write',
        'users.delete',
        'roles.read',
        'roles.write',
        'roles.delete',
        'productos.read',
        'productos.write',
        'productos.delete',
        'categorias.read',
        'categorias.write',
        'categorias.delete',
        'marcas.read',
        'marcas.write',
        'marcas.delete',
        'unidades.read',
        'unidades.write',
        'unidades.delete',
        'lotes.read',
        'lotes.write',
        'lotes.delete',
        'clientes.read',
        'clientes.write',
        'clientes.delete',
        'ordenes.read',
        'ordenes.write',
        'ordenes.delete',
        'alertas.read',
        'alertas.write',
        'bitacora.read',
        'backup.read',
        'backup.write',
        'pagos.read',
        'pagos.write',
        'proveedores.read',
        'proveedores.write',
        'proveedores.delete',
        'ordenes-compra.read',
        'ordenes-compra.write',
        'ordenes-compra.delete',
        'analytics.read',
        'suscripciones.read',
        'suscripciones.write',
    ]

    for (const key of permissionKeys) {
        await prisma.permission.upsert({
            where: { key },
            update: {},
            create: { key, description: key },
        })
    }
    console.log(`✅ ${permissionKeys.length} permissions created`)

    // 2) Create ADMIN role
    const adminRole = await prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: { name: 'ADMIN', description: 'Administrador con todos los permisos' },
    })

    // 3) Assign ALL permissions to ADMIN role
    const allPermissions = await prisma.permission.findMany()
    for (const perm of allPermissions) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
            update: {},
            create: { roleId: adminRole.id, permissionId: perm.id },
        })
    }
    console.log(`✅ ADMIN role created with ${allPermissions.length} permissions`)

    // 4) Create superuser
    const superEmail = 'admin@efarmacia.com'
    const superPassword = 'Admin123!'
    const passwordHash = await bcrypt.hash(superPassword, 10)

    const superUser = await prisma.user.upsert({
        where: { email: superEmail },
        update: {},
        create: {
            email: superEmail,
            passwordHash,
            firstName: 'Admin',
            lastName: 'eFarmacia',
            status: 'ACTIVE',
        },
    })

    // 5) Assign ADMIN role to superuser
    await prisma.userRole.upsert({
        where: { userId_roleId: { userId: superUser.id, roleId: adminRole.id } },
        update: {},
        create: { userId: superUser.id, roleId: adminRole.id },
    })

    console.log(`✅ Superuser created:`)
    console.log(`   Email:    ${superEmail}`)
    console.log(`   Password: ${superPassword}`)
    console.log('')
    console.log('🎉 Seed completed!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
