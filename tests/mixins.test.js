/**
 * Tests for the CRUD mixins attached to every model by implementsCRUD().
 *
 * These run against an in-memory SQLite database through real Sequelize models
 * built with defineModel(), so the mixins exercise the same toJSON snapshotting,
 * association accessors and query behavior they rely on in production.
 */

'use strict';

const { Sequelize } = require('sequelize');
const defineModel = require('../lib/models/define');
const { implementsCRUD } = require('../lib/models/mixins');

let sequelize;
let User;
let Post;
let Profile;
let Tag;

beforeEach(async () => {
	sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });

	User = defineModel(sequelize, 'User', (DataTypes) => ({ name: DataTypes.STRING }), { paranoid: true });
	Post = defineModel(sequelize, 'Post', (DataTypes) => ({ title: DataTypes.STRING }), { paranoid: true });
	Profile = defineModel(sequelize, 'Profile', (DataTypes) => ({ bio: DataTypes.STRING }), { paranoid: true });
	Tag = defineModel(sequelize, 'Tag', (DataTypes) => ({ label: DataTypes.STRING }), { paranoid: true });

	User.hasMany(Post);       // -> User.associations.Posts   (foreignKey 'UserId')
	User.hasOne(Profile);     // -> User.associations.Profile (foreignKey 'UserId')
	Post.belongsToMany(Tag, { through: 'PostTags' });   // -> Post.associations.Tags
	Tag.belongsToMany(Post, { through: 'PostTags' });

	await sequelize.sync({ force: true });
});

afterEach(async () => {
	await sequelize.close();
});


describe('implementsCRUD', () => {
	it('throws a TypeError when no modelDefinition is provided', () => {
		expect(() => implementsCRUD()).toThrow(TypeError);
	});

	it('attaches every CRUD method to the model', () => {
		for (const method of ['createWithIncludes', 'findById', 'findMany', 'updateOne', 'updateById', 'deleteOne', 'deleteById']) {
			expect(typeof User[method]).toBe('function');
		}
	});
});


describe('findMany', () => {
	// Regression: findMany used to reference an undefined `id`, throwing
	// ReferenceError on every call. It must now return the full collection.
	it('returns all records without throwing', async () => {
		await User.create({ name: 'a' });
		await User.create({ name: 'b' });

		const rows = await User.findMany();

		expect(Array.isArray(rows)).toBe(true);
		expect(rows).toHaveLength(2);
	});
});


describe('findById', () => {
	it('finds a record by id via the plain-options branch', async () => {
		const user = await User.create({ name: 'u' });

		const found = await User.findById(user.id);

		expect(found).not.toBeNull();
		expect(found.id).toBe(user.id);
	});
});


describe('updateOne — instance resolution', () => {
	it('updates an existing record and overlays the freshly saved column value', async () => {
		const user = await User.create({ name: 'old' });

		const result = await User.updateOne({ id: user.id }, { name: 'new' });

		expect(result._is_new_record).toBe(false);
		// The scalar overlay must reflect the post-save value, not the pre-snapshot one.
		expect(result.name).toBe('new');

		const reloaded = await User.findByPk(user.id);
		expect(reloaded.name).toBe('new');
	});

	it('creates the record when none matches and findOrCreate is enabled', async () => {
		const result = await User.updateOne({ id: 9999 }, { name: 'created' }, { findOrCreate: true });

		expect(result._is_new_record).toBe(true);
		expect(result.name).toBe('created');
		expect(await User.count()).toBe(1);
	});

	it('throws NotFound when no record matches and findOrCreate is off', async () => {
		await expect(User.updateOne({ id: 9999 }, { name: 'x' }))
			.rejects.toMatchObject({ name: 'NotFound' });
	});

	it('treats an empty where as invalid (NotFound without findOrCreate)', async () => {
		await User.create({ name: 'present' });

		await expect(User.updateOne({}, { name: 'x' }))
			.rejects.toMatchObject({ name: 'NotFound' });
	});
});


describe('updateOne — HasMany association', () => {
	it('updates child records', async () => {
		const user = await User.create({ name: 'u' });
		const post = await Post.create({ title: 't1', UserId: user.id });

		const result = await User.updateOne(
			{ id: user.id },
			{ name: 'u2', Posts: [{ id: post.id, title: 't1-updated' }] },
			{ include: [{ association: 'Posts' }] }
		);

		expect(result.Posts).toHaveLength(1);

		const reloaded = await Post.findByPk(post.id);
		expect(reloaded.title).toBe('t1-updated');
	});

	it('removes all children when passed an empty array', async () => {
		const user = await User.create({ name: 'u' });
		await Post.create({ title: 't', UserId: user.id });

		const result = await User.updateOne(
			{ id: user.id },
			{ Posts: [] },
			{ include: [{ association: 'Posts' }] }
		);

		expect(result.Posts).toEqual([]);
		expect(await Post.findAll({ where: { UserId: user.id } })).toHaveLength(0);
	});
});


describe('updateOne — HasOne association', () => {
	it('creates the child by foreign key when it has no primary key', async () => {
		const user = await User.create({ name: 'u' });

		const result = await User.updateOne(
			{ id: user.id },
			{ Profile: { bio: 'hello' } },
			{ include: [{ association: 'Profile' }] }
		);

		expect(result.Profile.bio).toBe('hello');

		const linked = await Profile.findOne({ where: { UserId: user.id } });
		expect(linked.bio).toBe('hello');
	});

	it('removes the child when passed null', async () => {
		const user = await User.create({ name: 'u' });
		await Profile.create({ bio: 'x', UserId: user.id });

		const result = await User.updateOne(
			{ id: user.id },
			{ Profile: null },
			{ include: [{ association: 'Profile' }] }
		);

		expect(result.Profile).toBeNull();
		expect(await Profile.findAll({ where: { UserId: user.id } })).toHaveLength(0);
	});
});


describe('updateOne — BelongsToMany association', () => {
	it('replaces the full set of links through the junction table', async () => {
		const post = await Post.create({ title: 'p' });
		const tag1 = await Tag.create({ label: 'a' });
		const tag2 = await Tag.create({ label: 'b' });

		const result = await Post.updateOne(
			{ id: post.id },
			{ Tags: [{ id: tag1.id }, { id: tag2.id }] },
			{ include: [{ association: 'Tags' }] }
		);

		expect(result.Tags).toHaveLength(2);
		expect(await post.getTags()).toHaveLength(2);
	});

	it('throws a 406 when a referenced record does not exist yet', async () => {
		const post = await Post.create({ title: 'p' });

		await expect(
			Post.updateOne(
				{ id: post.id },
				{ Tags: [{ id: 99999 }] },
				{ include: [{ association: 'Tags' }] }
			)
		).rejects.toMatchObject({ status: 406 });
	});
});


describe('updateById', () => {
	it('delegates to updateOne with a where of { id }', async () => {
		const user = await User.create({ name: 'old' });

		const result = await User.updateById(user.id, { name: 'new' });

		expect(result.name).toBe('new');
	});
});


describe('createWithIncludes', () => {
	it('creates the parent and its HasMany children', async () => {
		const [isNewRecord, data] = await User.createWithIncludes({
			name: 'u',
			Posts: [{ title: 't' }]
		});

		expect(isNewRecord).toBe(true);
		expect(data.name).toBe('u');
		expect(data.Posts).toHaveLength(1);
		expect(await Post.count()).toBe(1);
	});

	it('throws a 406 when a BelongsToMany record does not exist yet', async () => {
		await expect(
			Post.createWithIncludes({ title: 'p', Tags: [{ id: 99999 }] })
		).rejects.toMatchObject({ status: 406 });
	});
});


describe('deleteOne / deleteById', () => {
	it('deleteById removes the record by id', async () => {
		const user = await User.create({ name: 'd' });

		await User.deleteById(user.id);

		expect(await User.findByPk(user.id)).toBeNull();
	});

	it('deleteOne deletes at most one matching record (limit 1)', async () => {
		await User.create({ name: 'a' });
		await User.create({ name: 'b' });

		const affected = await User.deleteOne({ where: {} });

		expect(affected).toBe(1);
		expect(await User.count()).toBe(1);
	});
});
