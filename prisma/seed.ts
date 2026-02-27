import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // 1) Permission keys — exactly matching @Permissions() decorators in controllers
    const permissionKeys = [
        // Users
        'user.read',
        'user.create',
        'user.update',
        'user.delete',
        // Inventory (lotes)
        'inv.read',
        'inv.move',
        // Suppliers (proveedores)
        'supplier.read',
        'supplier.manage',
        // Orders (pedidos)
        'order.read',
        'order.manage',
        // Purchase orders (ordenes-compra)
        'purchase.read',
        'purchase.manage',
        // Alerts
        'alert.read',
        'alert.manage',
        // Analytics
        'analytics.read',
        'analytics.write',
        // Suscripciones
        'suscripciones.read',
        'suscripciones.write',
        // Backup & bitacora (no guard but add for completeness)
        'backup.read',
        'backup.write',
        'bitacora.read',
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
        update: { passwordHash },  // update password in case user exists
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

    console.log(`✅ Superuser ready:`)
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
