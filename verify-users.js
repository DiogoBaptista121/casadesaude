import { createClient } from '@supabase/supabase-js';

// Get credentials from .env
const SUPABASE_URL = "https://dqggoyhvdbzqfjleynme.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZ2dveWh2ZGJ6cWZqbGV5bm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzOTUyNDIsImV4cCI6MjA4Mzk3MTI0Mn0.TBns1W70BWBpc80QnuW-3U8c_53b1UUivj5UjKGb4Z0";
const ADMIN_EMAIL = 'wp7.baptista.ktm@gmail.com';
const ADMIN_USER_ID = 'de822293-cd2b-4e30-9d18-364fde74c72e';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyAndFixUsers() {
    console.log('🔍 Verificando dados de utilizadores...\n');

    // 1. Check admin profile
    console.log('1️⃣ Verificando perfil do administrador...');
    const { data: adminProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', ADMIN_USER_ID)
        .maybeSingle();

    if (profileError) {
        console.error('❌ Erro ao consultar perfil:', profileError);
    } else if (!adminProfile) {
        console.log('⚠️  Perfil do admin NÃO EXISTE!');
        console.log('   Tentando criar perfil...');

        const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
                id: ADMIN_USER_ID,
                email: ADMIN_EMAIL,
                nome: 'Diogo Baptista',
                ativo: true
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Erro ao criar perfil:', createError);
        } else {
            console.log('✅ Perfil criado:', newProfile);
        }
    } else {
        console.log('✅ Perfil existe:');
        console.log('   ID:', adminProfile.id);
        console.log('   Email:', adminProfile.email);
        console.log('   Nome:', adminProfile.nome || '⚠️ VAZIO!');
        console.log('   Ativo:', adminProfile.ativo);

        if (!adminProfile.nome || adminProfile.nome === 'Utilizador') {
            console.log('⚠️  Nome não está definido corretamente. Atualizando...');
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ nome: 'Diogo Baptista' })
                .eq('id', ADMIN_USER_ID);

            if (updateError) {
                console.error('❌ Erro ao atualizar nome:', updateError);
            } else {
                console.log('✅ Nome atualizado para "Diogo Baptista"');
            }
        }
    }

    console.log('\n2️⃣ Verificando role do administrador...');
    const { data: adminRole, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', ADMIN_USER_ID)
        .maybeSingle();

    if (roleError) {
        console.error('❌ Erro ao consultar role:', roleError);
    } else if (!adminRole) {
        console.log('⚠️  Role do admin NÃO EXISTE!');
        console.log('   Tentando criar role...');

        const { data: newRole, error: createRoleError } = await supabase
            .from('user_roles')
            .insert({
                user_id: ADMIN_USER_ID,
                role: 'admin'
            })
            .select()
            .single();

        if (createRoleError) {
            console.error('❌ Erro ao criar role:', createRoleError);
        } else {
            console.log('✅ Role criado:', newRole);
        }
    } else {
        console.log('✅ Role existe:');
        console.log('   User ID:', adminRole.user_id);
        console.log('   Role:', adminRole.role);
    }

    // 3. List all profiles
    console.log('\n3️⃣ Listando todos os perfis...');
    const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, nome, email, ativo')
        .order('nome');

    if (allProfilesError) {
        console.error('❌ Erro ao listar perfis:', allProfilesError);
    } else {
        console.log(`✅ Encontrados ${allProfiles?.length || 0} perfis:`);
        allProfiles?.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.nome || '(sem nome)'} - ${p.email} ${p.ativo ? '✓' : '✗'}`);
        });
    }

    // 4. List all roles
    console.log('\n4️⃣ Listando todos os roles...');
    const { data: allRoles, error: allRolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

    if (allRolesError) {
        console.error('❌ Erro ao listar roles:', allRolesError);
    } else {
        console.log(`✅ Encontrados ${allRoles?.length || 0} roles:`);
        allRoles?.forEach((r, i) => {
            console.log(`   ${i + 1}. User ID: ${r.user_id} - Role: ${r.role}`);
        });
    }

    console.log('\n✅ Verificação completa!');
}

verifyAndFixUsers().catch(console.error);
